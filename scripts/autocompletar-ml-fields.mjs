// Autocompleta los campos que ML pide en TODAS las motos del catálogo.
// Setea defaults globales y usa Claude (texto + visión) para inferir el resto.
//
// USO:
//   node scripts/autocompletar-ml-fields.mjs            # solo motos con campos null
//   node scripts/autocompletar-ml-fields.mjs --force    # rellena pisando lo viejo
//
// Costo aprox: ~$0.005 por moto (texto) + ~$0.003 por moto (color visión).
// Con 50 motos en el catálogo: ~$0.40 USD total.
import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"
import { config } from "dotenv"
config({ path: ".env.local", override: true })

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const FORCE = process.argv.includes("--force")

const COLORES_VALIDOS_ML = [
  "Negro", "Blanco", "Rojo", "Azul", "Verde", "Amarillo", "Naranja",
  "Gris", "Plateado", "Marrón", "Beige", "Violeta", "Rosa",
  "Bordó", "Celeste", "Dorado",
]

const FRENOS_VALIDOS = [
  "Delantero y trasero", "Solo delantero", "Solo trasero", "ABS", "Disco hidráulico",
]
const TIPO_MOTOR_VALIDOS = ["4 tiempos", "2 tiempos", "Eléctrico"]
const SISTEMA_ARRANQUE_VALIDOS = [
  "Eléctrico", "A patada", "Eléctrico y a patada",
]

// Cloudinary → JPG resize para que Claude vision pueda leerla.
function urlClaude(url) {
  if (!url.includes("res.cloudinary.com")) return url
  return url.replace(/\/upload\//, "/upload/f_jpg,w_1024,q_auto/")
}

async function detectarColor(fotoUrl, motoNombre) {
  const prompt = `Mirá esta foto de una moto "${motoNombre}". ¿Cuál es el COLOR PRINCIPAL del cuerpo/carrocería de la moto?
Respondé SOLO con UNA palabra de esta lista exacta:
${COLORES_VALIDOS_ML.join(", ")}

Si ves múltiples colores prominentes, elegí el dominante. Si no estás seguro, "Negro" es la respuesta más segura.
Respondé SOLO con la palabra del color, sin punto, sin comillas, sin nada más.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 16,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: urlClaude(fotoUrl) } },
          { type: "text", text: prompt },
        ],
      },
    ],
  })
  const texto = response.content[0]
  if (texto.type !== "text") return null
  const color = texto.text.trim().replace(/[.\s"'`]/g, "")
  const match = COLORES_VALIDOS_ML.find((c) => c.toLowerCase() === color.toLowerCase())
  return match || null
}

async function inferirSpecsConIA(moto) {
  const titulo = `${moto.marca} ${moto.nombre}${moto.anio ? ` ${moto.anio}` : ""}`
  const prompt = `Sos experto en motocicletas. Te paso una moto y necesito que devuelvas las specs técnicas TÍPICAS de fábrica de ese modelo.

Moto: ${titulo}
Cilindrada: ${moto.cilindrada || "(no informada)"}

Devolvé SOLO un objeto JSON válido con estos campos. Si no sabés un valor con certeza alta, ponelo en null. Es preferible null antes que inventar datos.

{
  "frenos": uno de [${FRENOS_VALIDOS.map((s) => `"${s}"`).join(", ")}] o null,
  "tipoMotor": uno de [${TIPO_MOTOR_VALIDOS.map((s) => `"${s}"`).join(", ")}] o null,
  "potenciaHp": número en HP o null,
  "capacidadTanque": número en cc (ej 12000 = 12 litros) o null,
  "sistemaArranque": uno de [${SISTEMA_ARRANQUE_VALIDOS.map((s) => `"${s}"`).join(", ")}] o null,
  "velocidadMaxima": número en km/h o null,
  "numeroVelocidades": cantidad de marchas o null,
  "alturaAsiento": número en cm o null,
  "eficienciaKmL": número en km/litro o null,
  "distanciaEjesCm": distancia entre ejes en cm o null,
  "largoMm": largo total en mm o null,
  "alturaMm": altura total en mm o null,
  "anchoMm": ancho total en mm o null,
  "pesoKg": peso seco en kg o null
}

Devolvé SOLO el JSON, sin texto adicional, sin markdown, sin \`\`\`.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  })
  const texto = response.content[0]
  if (texto.type !== "text") return {}
  const raw = texto.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch (e) {
    console.warn(`  ⚠️  No se pudo parsear JSON: ${raw.slice(0, 100)}...`)
    return {}
  }
}

// Filtra valores: solo aplica los validados; descarta lo invalido.
function sanear(spec) {
  const out = {}
  if (typeof spec.frenos === "string" && FRENOS_VALIDOS.includes(spec.frenos)) {
    out.frenos = spec.frenos
  }
  if (typeof spec.tipoMotor === "string" && TIPO_MOTOR_VALIDOS.includes(spec.tipoMotor)) {
    out.tipoMotor = spec.tipoMotor
  }
  if (typeof spec.sistemaArranque === "string" && SISTEMA_ARRANQUE_VALIDOS.includes(spec.sistemaArranque)) {
    out.sistemaArranque = spec.sistemaArranque
  }
  for (const k of [
    "potenciaHp", "capacidadTanque", "velocidadMaxima", "numeroVelocidades",
    "alturaAsiento", "distanciaEjesCm", "largoMm", "alturaMm", "anchoMm", "pesoKg",
  ]) {
    if (typeof spec[k] === "number" && spec[k] > 0 && spec[k] < 1000000) {
      out[k] = Math.round(spec[k])
    }
  }
  if (typeof spec.eficienciaKmL === "number" && spec.eficienciaKmL > 0 && spec.eficienciaKmL < 200) {
    out.eficienciaKmL = spec.eficienciaKmL
  }
  return out
}

async function main() {
  console.log(`📦 Autocompletando campos ML en motos${FORCE ? " [FORCE]" : ""}...\n`)

  // 1) Defaults globales (rapidos, todo de una)
  const updates = []

  // transmision = Manual donde sea null
  const r1 = await prisma.modelo.updateMany({
    where: FORCE ? {} : { transmision: null },
    data: { transmision: "Manual" },
  })
  updates.push(`Transmisión = "Manual" → ${r1.count}`)

  // combustible = Nafta donde sea null
  const r2 = await prisma.modelo.updateMany({
    where: FORCE ? {} : { combustible: null },
    data: { combustible: "Nafta" },
  })
  updates.push(`Combustible = "Nafta" → ${r2.count}`)

  // marcaMotor = marca de la moto donde sea null (en general son iguales)
  if (!FORCE) {
    const sinMarcaMotor = await prisma.modelo.findMany({
      where: { marcaMotor: null },
      select: { id: true, marca: true },
    })
    for (const m of sinMarcaMotor) {
      await prisma.modelo.update({ where: { id: m.id }, data: { marcaMotor: m.marca } })
    }
    updates.push(`marcaMotor = marca → ${sinMarcaMotor.length}`)
  }

  // garantía de fábrica = true para 0KM (las usadas se quedan en false)
  const r3 = await prisma.modelo.updateMany({
    where: { condicion: "0KM" },
    data: { garantiaFabrica: true },
  })
  updates.push(`garantiaFabrica = true (0KM) → ${r3.count}`)

  // booleans con defaults
  const r4 = await prisma.modelo.updateMany({
    where: FORCE ? {} : { aceptaPermuta: false },
    data: { aceptaPermuta: true },
  })
  updates.push(`aceptaPermuta = true → ${r4.count}`)

  const r5 = await prisma.modelo.updateMany({
    where: FORCE ? {} : { precioNegociable: false },
    data: { precioNegociable: true },
  })
  updates.push(`precioNegociable = true → ${r5.count}`)

  console.log("✅ Defaults globales:")
  for (const u of updates) console.log(`   ${u}`)

  // 2) Inferir specs técnicas con IA (texto)
  const where = FORCE
    ? {}
    : {
        OR: [
          { frenos: null }, { tipoMotor: null }, { potenciaHp: null },
          { capacidadTanque: null }, { velocidadMaxima: null },
        ],
      }
  const motos = await prisma.modelo.findMany({
    where,
    select: {
      id: true, marca: true, nombre: true, anio: true, cilindrada: true,
      // valores actuales para no pisarlos si ya estan cargados (a menos que --force)
      frenos: true, tipoMotor: true, potenciaHp: true, capacidadTanque: true,
      sistemaArranque: true, velocidadMaxima: true, numeroVelocidades: true,
      alturaAsiento: true, eficienciaKmL: true, distanciaEjesCm: true,
      largoMm: true, alturaMm: true, anchoMm: true, pesoKg: true,
    },
  })

  console.log(`\n🤖 Infiriendo specs técnicas con IA en ${motos.length} motos...`)
  console.log("   (cada análisis tarda ~3s y cuesta ~$0.005)\n")

  let inferidas = 0
  let fallidas = 0
  for (const m of motos) {
    const titulo = `${m.marca} ${m.nombre}${m.anio ? ` ${m.anio}` : ""}`
    try {
      const spec = await inferirSpecsConIA(m)
      const limpio = sanear(spec)
      // No pisar lo que ya esta cargado salvo --force
      const data = {}
      for (const [k, v] of Object.entries(limpio)) {
        if (FORCE || m[k] == null) data[k] = v
      }
      if (Object.keys(data).length === 0) {
        console.log(`  ⏭️  ${titulo}: nada para actualizar`)
        continue
      }
      await prisma.modelo.update({ where: { id: m.id }, data })
      console.log(`  ✅ ${titulo}: ${Object.keys(data).length} campos`)
      inferidas++
    } catch (e) {
      console.log(`  ❌ ${titulo}: ${e instanceof Error ? e.message : "error"}`)
      fallidas++
    }
  }

  // 3) Color por visión (último, separado porque es más caro)
  const sinColor = await prisma.modelo.findMany({
    where: FORCE ? { fotos: { isEmpty: false } } : { color: null, fotos: { isEmpty: false } },
    select: { id: true, nombre: true, marca: true, fotos: true },
  })
  console.log(`\n🎨 Detectando color con visión en ${sinColor.length} motos...`)
  console.log("   (cada análisis tarda ~2s y cuesta ~$0.003)\n")

  let detectadas = 0
  let colorFallidas = 0
  for (const m of sinColor) {
    const fotosPublicas = m.fotos.filter((u) => /^https?:\/\//i.test(u))
    if (fotosPublicas.length === 0) {
      colorFallidas++
      continue
    }
    const titulo = `${m.marca} ${m.nombre}`
    try {
      const color = await detectarColor(fotosPublicas[0], titulo)
      if (!color) {
        console.log(`  ⚠️  ${titulo}: respuesta inválida`)
        colorFallidas++
        continue
      }
      await prisma.modelo.update({ where: { id: m.id }, data: { color } })
      console.log(`  ✅ ${titulo} → ${color}`)
      detectadas++
    } catch (e) {
      console.log(`  ❌ ${titulo}: ${e instanceof Error ? e.message : "error"}`)
      colorFallidas++
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`Defaults globales aplicados: ${updates.length}`)
  console.log(`Specs inferidas por IA:  ${inferidas} ok / ${fallidas} fail`)
  console.log(`Color por visión:        ${detectadas} ok / ${colorFallidas} fail`)
  console.log(
    "\nRevisá los datos en /admin/modelos. Lo que sea null seguirá en blanco — ML lo omite automáticamente."
  )
}

main()
  .catch((e) => {
    console.error("FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// Genera descripciones atractivas con IA para todas las motos del catalogo.
// Cada descripcion tiene:
//   1. 2-3 parrafos generados por Claude usando specs de la moto.
//   2. Bloque fijo abajo con beneficios (financiacion, permuta, servicio tecnico)
//      y datos de la concesionaria.
//
// USO:
//   node scripts/generar-descripciones.mjs --dry-run [--limit 3]   # imprime sin guardar
//   node scripts/generar-descripciones.mjs                          # solo motos sin descripcion
//   node scripts/generar-descripciones.mjs --force                  # pisa todas las descripciones
//
// Costo: ~$0.005 por moto. Con 56 motos ≈ $0.30 USD.
import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"
import { config } from "dotenv"
config({ path: ".env.local", override: true })

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const args = process.argv.slice(2)
const FORCE = args.includes("--force")
const DRY_RUN = args.includes("--dry-run")
const LIMIT_IDX = args.indexOf("--limit")
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1] || "0") : 0

// Bloque fijo que se concatena al final de cada descripcion. Mismo
// formato para todas las motos. Usa SOLO ASCII porque ML rechaza
// emojis y caracteres unicode "raros" como description.type.invalid
// con referencias a posiciones específicas en plain_text.
const BLOQUE_CONCESIONARIA = `

------------------------------

- Financiacion propia en cuotas en pesos sin sorpresas
- Aceptamos tu moto en parte de pago - te tasamos en el momento
- Servicio tecnico oficial post-venta
- Patentamiento, transferencia y tramites a acordar (no incluidos)

** TIENDA OFICIAL MOTOS FERNANDEZ **
+38 anos vendiendo motos en Bahia Blanca
Direccion: Brown 1052, Bahia Blanca, Buenos Aires
WhatsApp: +54 9 2915 78-8671
Horario: Lunes a Viernes de 9 a 17 hs
Web: motosfernandez.com.ar`

async function generarConIA(moto) {
  const specs = []
  if (moto.cilindrada) specs.push(`cilindrada ${moto.cilindrada}`)
  if (moto.potenciaHp) specs.push(`${moto.potenciaHp} HP`)
  if (moto.tipoMotor) specs.push(`motor ${moto.tipoMotor.toLowerCase()}`)
  if (moto.transmision) specs.push(`transmisión ${moto.transmision.toLowerCase()}`)
  if (moto.frenos) specs.push(`frenos ${moto.frenos.toLowerCase()}`)
  if (moto.combustible && moto.combustible !== "Nafta") {
    specs.push(`combustible ${moto.combustible.toLowerCase()}`)
  }
  if (moto.color) specs.push(`color ${moto.color.toLowerCase()}`)
  if (moto.numeroVelocidades) specs.push(`${moto.numeroVelocidades} velocidades`)
  if (moto.capacidadTanque) {
    specs.push(`tanque ${(moto.capacidadTanque / 1000).toFixed(1)} L`)
  }
  if (moto.alturaAsiento) specs.push(`altura asiento ${moto.alturaAsiento} cm`)
  if (moto.eficienciaKmL) specs.push(`consumo ${moto.eficienciaKmL} km/l`)

  const condicion = moto.condicion === "0KM" ? "0 km a estrenar" : "usada"
  const km = moto.kilometros != null ? `${moto.kilometros.toLocaleString("es-AR")} km` : ""

  const prompt = `Sos un copywriter experto en motos. Generá una descripción ATRACTIVA y BREVE para el catálogo de una concesionaria multimarca en Bahía Blanca, Argentina.

MOTO:
- ${moto.marca} ${moto.nombre}${moto.anio ? ` ${moto.anio}` : ""}
- Condición: ${condicion}${km ? ` (${km})` : ""}
- Specs: ${specs.length > 0 ? specs.join(", ") : "(no informadas)"}
${moto.descripcion ? `- Descripción actual (mejorala): ${moto.descripcion.slice(0, 300)}` : ""}

TONO:
- Profesional pero cercano, español argentino
- Sin tildar de "increíble" ni "imperdible" ni clichés vacíos
- Usá el "vos" no el "tú"
- Concreto: hablá de para qué sirve la moto (calle, ruta, off-road, ciudad), de la sensación al manejarla, de quién es el público

ESTRUCTURA:
- Párrafo 1 (2-3 oraciones): qué tipo de moto es y para qué uso ideal está pensada.
- Párrafo 2 (2-3 oraciones): destacá las specs más importantes que tengas (no las inventes), traducidas al beneficio real para el usuario.
- NO incluyas datos de la concesionaria, financiación ni contacto — eso lo agrego yo después.
- NO uses títulos ni viñetas ni emojis.
- Total: máximo 90 palabras.

Devolvé SOLO el texto plano, sin comillas, sin prefijos.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 350,
    messages: [{ role: "user", content: prompt }],
  })
  const block = response.content[0]
  if (block.type !== "text") return null
  return block.text.trim().replace(/^["']|["']$/g, "")
}

async function main() {
  console.log(
    `📝 Generando descripciones${FORCE ? " [FORCE]" : ""}${DRY_RUN ? " [DRY-RUN]" : ""}${LIMIT ? ` [LIMIT=${LIMIT}]` : ""}...\n`
  )

  const where = FORCE
    ? { activo: true, vendida: false }
    : {
        activo: true,
        vendida: false,
        OR: [{ descripcion: null }, { descripcion: "" }],
      }

  const motos = await prisma.modelo.findMany({
    where,
    orderBy: [{ slug: "asc" }],
    select: {
      id: true,
      slug: true,
      marca: true,
      nombre: true,
      anio: true,
      cilindrada: true,
      kilometros: true,
      condicion: true,
      color: true,
      transmision: true,
      combustible: true,
      frenos: true,
      tipoMotor: true,
      potenciaHp: true,
      numeroVelocidades: true,
      capacidadTanque: true,
      alturaAsiento: true,
      eficienciaKmL: true,
      descripcion: true,
    },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  })

  console.log(`Total a procesar: ${motos.length}\n`)

  let ok = 0
  let fail = 0
  for (const m of motos) {
    const titulo = `${m.marca} ${m.nombre}${m.anio ? ` ${m.anio}` : ""}`
    try {
      const cuerpo = await generarConIA(m)
      if (!cuerpo) {
        console.log(`  ⚠️  ${titulo}: sin respuesta`)
        fail++
        continue
      }
      const final = cuerpo + BLOQUE_CONCESIONARIA

      if (DRY_RUN) {
        console.log(`\n──────── ${titulo} ────────`)
        console.log(final)
      } else {
        await prisma.modelo.update({
          where: { id: m.id },
          data: { descripcion: final },
        })
        console.log(`  ✅ ${titulo}: ${cuerpo.length} chars`)
      }
      ok++
    } catch (e) {
      console.log(`  ❌ ${titulo}: ${e instanceof Error ? e.message : "error"}`)
      fail++
    }
  }

  console.log(`\n=== RESUMEN ===`)
  console.log(`Generadas: ${ok}`)
  console.log(`Fallidas:  ${fail}`)
  if (DRY_RUN) {
    console.log(
      "\n⚠️  Estaba en --dry-run, no se guardó nada en la DB.\nSi te gustó, corré el script de nuevo sin --dry-run."
    )
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

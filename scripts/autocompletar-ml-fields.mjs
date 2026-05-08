// Autocompleta los campos que ML pide en TODAS las motos del catálogo:
// - transmision = "Manual"  (default genérico, después editás las automáticas)
// - combustible = "Nafta"   (default genérico)
// - color = detectado con Claude Vision desde la primera foto
//
// USO: node scripts/autocompletar-ml-fields.mjs
//
// Solo afecta motos donde el campo respectivo es NULL (no pisa lo que ya cargaste).
import { PrismaClient } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"
import { config } from "dotenv"
config({ path: ".env.local", override: true })

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const COLORES_VALIDOS_ML = [
  "Negro", "Blanco", "Rojo", "Azul", "Verde", "Amarillo", "Naranja",
  "Gris", "Plateado", "Marrón", "Beige", "Violeta", "Rosa",
  "Bordó", "Celeste", "Dorado",
]

// Convierte URL de Cloudinary a JPG redimensionado para Claude vision.
// Necesario para fotos HEIC/HEIF que Anthropic no soporta directo.
function urlClaude(url) {
  if (!url.includes("res.cloudinary.com")) return url
  // Insertar transformaciones después de /upload/
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
  // Validar que sea uno de los válidos
  const match = COLORES_VALIDOS_ML.find(
    (c) => c.toLowerCase() === color.toLowerCase()
  )
  return match || null
}

async function main() {
  console.log("📦 Autocompletando campos ML en motos...\n")

  // 1) Bulk update transmision y combustible donde son null
  const r1 = await prisma.modelo.updateMany({
    where: { transmision: null },
    data: { transmision: "Manual" },
  })
  console.log(`✅ Transmisión = "Manual" → ${r1.count} motos actualizadas`)

  const r2 = await prisma.modelo.updateMany({
    where: { combustible: null },
    data: { combustible: "Nafta" },
  })
  console.log(`✅ Combustible = "Nafta" → ${r2.count} motos actualizadas`)

  // 2) Detectar color con vision para las que no tengan
  const sinColor = await prisma.modelo.findMany({
    where: {
      color: null,
      fotos: { isEmpty: false },
    },
    select: { id: true, nombre: true, marca: true, fotos: true },
  })
  console.log(`\n🎨 Detectando color con IA en ${sinColor.length} motos...`)
  console.log("   (cada análisis tarda ~2s y cuesta ~$0.003)\n")

  let detectadas = 0
  let fallidas = 0
  for (const m of sinColor) {
    const fotosPublicas = m.fotos.filter((u) => /^https?:\/\//i.test(u))
    if (fotosPublicas.length === 0) {
      console.log(`  ⏭️  ${m.marca} ${m.nombre}: sin fotos públicas, skip`)
      fallidas++
      continue
    }
    const titulo = `${m.marca} ${m.nombre}`
    try {
      const color = await detectarColor(fotosPublicas[0], titulo)
      if (!color) {
        console.log(`  ⚠️  ${titulo}: respuesta inválida, skip`)
        fallidas++
        continue
      }
      await prisma.modelo.update({
        where: { id: m.id },
        data: { color },
      })
      console.log(`  ✅ ${titulo} → ${color}`)
      detectadas++
    } catch (e) {
      console.log(`  ❌ ${titulo}: ${e instanceof Error ? e.message : "error"}`)
      fallidas++
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`Transmisión actualizada: ${r1.count}`)
  console.log(`Combustible actualizado: ${r2.count}`)
  console.log(`Color detectado por IA:  ${detectadas}`)
  console.log(`No se pudo detectar:     ${fallidas}`)
  console.log("\nDespués revisá manualmente los colores que no te convenzan en /admin/modelos.")
}

main()
  .catch((e) => {
    console.error("FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

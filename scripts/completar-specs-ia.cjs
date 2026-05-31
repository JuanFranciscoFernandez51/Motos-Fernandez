#!/usr/bin/env node
/**
 * Autocompleta specs técnicas con Claude para las motos 0KM que tienen
 * foto pero todavía no tienen specs cargadas.
 *
 * Usa el mismo system prompt que /api/admin/specs-ia: devuelve solo
 * datos seguros, omite lo que no sabe, nunca inventa.
 *
 * Idempotente: salta las que ya tienen specs con ≥3 claves.
 * Rate-limit suave: 600ms entre llamadas para no saturar la API.
 *
 * Uso:
 *   node scripts/completar-specs-ia.cjs            (todas las 0km con foto)
 *   node scripts/completar-specs-ia.cjs --marca Kawasaki
 */

// override:true porque ANTHROPIC_API_KEY puede existir vacía en el shell
// environment (heredada), y dotenv por default no pisa lo ya seteado.
require("dotenv").config({ path: ".env.local", override: true })
const Anthropic = require("@anthropic-ai/sdk")
const { PrismaClient } = require("@prisma/client")

const SYSTEM_PROMPT = `Sos un experto en motocicletas con acceso a datos técnicos de todas las marcas. Tu única tarea es devolver las especificaciones técnicas de una moto específica en formato JSON.

REGLAS ESTRICTAS:
1. Devolvé SOLO un objeto JSON válido, SIN markdown, SIN bloques de código, SIN explicaciones.
2. Las CLAVES deben ser en español argentino con Mayúscula Inicial (ej: "Motor", "Potencia máxima").
3. Los VALORES deben ser strings cortos (máximo 50 caracteres) con unidades en formato argentino.
4. Si no estás 100% seguro de algún dato, OMITÍ esa clave. Mejor menos datos seguros que inventar.
5. Si el modelo/año no existe o no lo conocés, devolvé {}.
6. NO inventes datos. Si tenés dudas, omití.

CLAVES SUGERIDAS (usá solo las que sepas):
"Motor","Cilindrada","Potencia máxima","Torque máximo","Alimentación","Transmisión","Arranque","Freno delantero","Freno trasero","Suspensión delantera","Suspensión trasera","Rueda delantera","Rueda trasera","Capacidad de tanque","Peso en orden de marcha","Asiento (altura)","Distancia entre ejes"

FORMATO DE SALIDA (solo JSON puro, nada más):
{"Motor": "...", "Cilindrada": "...", ...}`

function getArg(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY")
  const client = new Anthropic({ apiKey })
  const prisma = new PrismaClient()
  const marcaFiltro = getArg("--marca")

  let completadas = 0
  let salteadas = 0
  let vacias = 0
  const errores = []

  try {
    const motos = await prisma.modelo.findMany({
      where: {
        condicion: "0KM",
        activo: true,
        fotos: { isEmpty: false },
        ...(marcaFiltro
          ? { marca: { equals: marcaFiltro, mode: "insensitive" } }
          : {}),
      },
      select: { id: true, marca: true, nombre: true, anio: true, specs: true },
      orderBy: [{ marca: "asc" }, { nombre: "asc" }],
    })

    console.log(`Motos candidatas: ${motos.length}\n`)

    for (const m of motos) {
      // Saltar las que ya tienen specs razonables
      const specsActuales = m.specs && typeof m.specs === "object" ? m.specs : null
      if (specsActuales && Object.keys(specsActuales).length >= 3) {
        salteadas++
        continue
      }

      const userPrompt = `Dame las especificaciones técnicas de la siguiente moto:

Marca: ${m.marca}
Modelo: ${m.nombre}${m.anio ? `\nAño: ${m.anio}` : ""}

Devolvé SOLO el JSON con las specs que sepas con certeza.`

      try {
        const resp = await client.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 900,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        })
        const text = resp.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim()
        // Parsear JSON (puede venir con texto alrededor — extraer el objeto)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const specs = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

        if (Object.keys(specs).length === 0) {
          vacias++
          console.log(`∅ ${m.marca} ${m.nombre} — Claude no tenía datos seguros`)
        } else {
          await prisma.modelo.update({
            where: { id: m.id },
            data: { specs },
          })
          completadas++
          console.log(
            `✅ ${m.marca} ${m.nombre} — ${Object.keys(specs).length} specs`
          )
        }
      } catch (e) {
        errores.push(`${m.marca} ${m.nombre} — ${e.message}`)
      }

      // Rate-limit suave
      await new Promise((r) => setTimeout(r, 600))
    }

    console.log(
      `\nCompletadas: ${completadas} · Sin datos: ${vacias} · Salteadas (ya tenían): ${salteadas}`
    )
    if (errores.length) {
      console.log("\nErrores:")
      errores.forEach((e) => console.log("  ", e))
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})

#!/usr/bin/env node
/**
 * Autocompleta specs técnicas con Claude para TODAS las motos 0KM activas
 * que todavía no tienen specs cargadas (tengan o no foto).
 *
 * Variante de completar-specs-ia.cjs: idéntica salvo que NO filtra por
 * `fotos: { isEmpty: false }`. Francisco quiere completar TODAS las 0km.
 *
 * Usa el mismo system prompt que /api/admin/specs-ia: devuelve solo
 * datos seguros, omite lo que no sabe, nunca inventa.
 *
 * Idempotente: salta las que ya tienen specs con ≥3 claves.
 * Rate-limit suave: 600ms entre llamadas para no saturar la API.
 * Si la API tira 429, espera y reintenta esa misma moto.
 *
 * Uso:
 *   node scripts/completar-specs-ia-todas.cjs            (todas las 0km)
 *   node scripts/completar-specs-ia-todas.cjs --marca Kawasaki
 *   node scripts/completar-specs-ia-todas.cjs --solo-conteo   (no llama a la API)
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

function hasFlag(flag) {
  return process.argv.includes(flag)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const soloConteo = hasFlag("--solo-conteo")
  const prisma = new PrismaClient()
  const marcaFiltro = getArg("--marca")

  let client = null
  if (!soloConteo) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY")
    client = new Anthropic({ apiKey })
  }

  let completadas = 0
  let salteadas = 0
  let vacias = 0
  const errores = []

  try {
    // SIN filtro de fotos: TODAS las 0km activas.
    const motos = await prisma.modelo.findMany({
      where: {
        condicion: "0KM",
        activo: true,
        ...(marcaFiltro
          ? { marca: { equals: marcaFiltro, mode: "insensitive" } }
          : {}),
      },
      select: { id: true, marca: true, nombre: true, anio: true, specs: true },
      orderBy: [{ marca: "asc" }, { nombre: "asc" }],
    })

    // Conteo previo
    const yaTienen = motos.filter((m) => {
      const s = m.specs && typeof m.specs === "object" ? m.specs : null
      return s && Object.keys(s).length >= 3
    }).length
    const faltan = motos.length - yaTienen

    console.log(`=== CONTEO ===`)
    console.log(`Total 0km activas${marcaFiltro ? ` (${marcaFiltro})` : ""}: ${motos.length}`)
    console.log(`Ya tienen specs (≥3 claves): ${yaTienen}`)
    console.log(`Faltan completar: ${faltan}\n`)

    if (soloConteo) {
      console.log("(--solo-conteo: no se llama a la API)")
      return
    }

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

      // Reintentos con backoff para rate-limit (429) u otros errores transitorios.
      let intentos = 0
      const maxIntentos = 5
      let procesada = false

      while (!procesada && intentos < maxIntentos) {
        intentos++
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
          procesada = true
        } catch (e) {
          const status = e?.status || e?.response?.status
          const esRateLimit = status === 429 || status === 529
          if (esRateLimit && intentos < maxIntentos) {
            const esperaMs = 5000 * intentos // backoff lineal: 5s, 10s, 15s...
            console.log(
              `⏳ Rate-limit en ${m.marca} ${m.nombre} (intento ${intentos}/${maxIntentos}). Esperando ${esperaMs / 1000}s...`
            )
            await sleep(esperaMs)
          } else {
            errores.push(`${m.marca} ${m.nombre} — ${e.message}`)
            procesada = true
          }
        }
      }

      // Rate-limit suave
      await sleep(600)
    }

    console.log(
      `\n=== RESULTADO ===\nCompletadas: ${completadas} · Sin datos seguros: ${vacias} · Salteadas (ya tenían): ${salteadas}`
    )
    if (errores.length) {
      console.log(`\nErrores (${errores.length}):`)
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

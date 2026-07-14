import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { CAMPAIGN_OBJECTIVES, OBJECTIVE_LABELS } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/admin/meta/ads/suggest-caption
 * Genera un caption de anuncio con Claude API, optimizado según la
 * moto + el objetivo de campaña.
 *
 * Body: { motoId, objective }
 * Devuelve: { caption: string, hashtags: string[] }
 */
const schema = z.object({
  motoId: z.string().min(1),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
})

const SYSTEM_PROMPT = `Sos copywriter especializado en anuncios de Meta Ads para una concesionaria de motos argentina (Motos Fernandez, Bahía Blanca).

Generás copys de anuncio en español argentino, profesional pero cercano. Tu objetivo es maximizar conversiones según el objetivo de la campaña.

Reglas:
- Entre 150 y 280 caracteres (incluyendo hashtags).
- Hook fuerte en la primera línea (emoji + frase corta).
- Mencionar marca, modelo y precio si está.
- Cierre con CTA al WhatsApp +54 9 291 578-8671.
- 4-6 hashtags al final: #motosfernandez #bahiablanca + 2-3 específicos de la moto.
- Sin signos de exclamación apilados (!!!!). Sin emojis excesivos.
- NO usar palabras prohibidas por Meta: "vos", "te", "tu" deben evitarse en el copy del anuncio (Meta penaliza referencias personales directas).

Adaptación por objetivo:
- OUTCOME_TRAFFIC: hook con dato concreto, CTA "Conocé la ficha completa".
- OUTCOME_LEADS: hook con beneficio, CTA "Consultanos por WhatsApp".
- OUTCOME_ENGAGEMENT: pregunta o hook emocional, busca comentarios.
- OUTCOME_AWARENESS: hook con identidad de marca, sin presión.

Devolvé SOLO el texto del anuncio, sin comillas ni explicaciones.`

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no está configurada" },
      { status: 500 }
    )
  }

  const moto = await prisma.modelo.findUnique({
    where: { id: parsed.data.motoId },
    select: {
      marca: true,
      nombre: true,
      anio: true,
      kilometros: true,
      condicion: true,
      cilindrada: true,
      precio: true,
      moneda: true,
      categoriaVehiculo: true,
      descripcion: true,
      etiqueta: true,
    },
  })
  if (!moto) return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 })

  const precioStr = moto.precio
    ? moto.moneda === "USD"
      ? `USD ${moto.precio.toLocaleString("es-AR")}`
      : `$${moto.precio.toLocaleString("es-AR")}`
    : "consultar precio"

  const userPrompt = `Generá un copy de anuncio Meta Ads para esta moto:

- Marca: ${moto.marca}
- Modelo: ${moto.nombre}
- Año: ${moto.anio || "no especificado"}
- Condición: ${moto.condicion || "USADA"}
${moto.kilometros ? `- Kilómetros: ${moto.kilometros.toLocaleString("es-AR")}\n` : ""}${moto.cilindrada ? `- Cilindrada: ${moto.cilindrada}\n` : ""}- Categoría: ${moto.categoriaVehiculo}
- Precio: ${precioStr}
${moto.etiqueta ? `- Etiqueta especial: ${moto.etiqueta}\n` : ""}${moto.descripcion ? `\nDescripción del modelo:\n${moto.descripcion.slice(0, 400)}\n` : ""}

Objetivo de la campaña: ${OBJECTIVE_LABELS[parsed.data.objective]}

Generá el copy del anuncio listo para usar. Solo el texto.`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      thinking: { type: "disabled" },
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim()

    return NextResponse.json({ caption: text })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Claude no pudo generar el caption: " +
          (e instanceof Error ? e.message : String(e)),
      },
      { status: 500 }
    )
  }
}

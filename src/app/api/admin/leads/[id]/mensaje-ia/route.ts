import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { BUSINESS } from "@/lib/constants"

/**
 * POST /api/admin/leads/[id]/mensaje-ia
 * body: { modo?: "nuevo" | "recontacto" }
 * Devuelve un mensaje de WhatsApp redactado por IA para ese lead, listo para
 * enviar (saludo + referencia a la moto de interés + invitación a avanzar).
 * No envía nada: el admin lo manda con 1 clic por wa.me (revisable/editable).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const modo = body.modo === "recontacto" ? "recontacto" : "nuevo"

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      nombre: true,
      apellido: true,
      origen: true,
      ciudad: true,
      modeloInteres: true,
      createdAt: true,
      modelo: { select: { nombre: true, marca: true, precio: true, moneda: true } },
    },
  })
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })

  const moto = lead.modelo
    ? `${lead.modelo.marca || ""} ${lead.modelo.nombre}`.trim()
    : lead.modeloInteres || null
  const nombre = lead.nombre?.split(" ")[0] || lead.nombre || ""
  const diasDesde = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000)

  const contexto = [
    `Negocio: ${BUSINESS.name} (concesionaria de motos en Bahía Blanca, Argentina).`,
    `Cliente potencial: ${nombre}.`,
    moto ? `Moto que consultó: ${moto}.` : `No especificó una moto puntual.`,
    lead.ciudad ? `Ciudad: ${lead.ciudad}.` : null,
    `Origen del contacto: ${lead.origen}.`,
    modo === "recontacto"
      ? `Es un RE-CONTACTO: consultó hace ${diasDesde} días y no avanzó. Retomar con cordialidad, sin reproches, ofreciendo ayuda y novedades (disponibilidad, financiación).`
      : `Es la PRIMERA respuesta a su consulta. Responder rápido y cálido para no perder el interés.`,
  ]
    .filter(Boolean)
    .join("\n")

  const prompt = `Sos un vendedor de una concesionaria de motos en Argentina. Escribí UN mensaje de WhatsApp para mandarle a este cliente potencial.

${contexto}

Reglas:
- Español argentino, tono cercano y profesional (de "vos"), nada robótico.
- Cortito: 2 a 4 líneas. Sin asunto, sin firma con datos, sin links.
- Mencioná la moto si la hay. Cerrá con una pregunta o invitación concreta (coordinar una visita, pasar info/financiación, evacuar dudas).
- No inventes precios, promociones ni stock que no estén en el contexto.
- Devolvé SOLO el texto del mensaje, sin comillas ni explicaciones.`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    })
    const mensaje = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
    return NextResponse.json({ mensaje })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error de IA" }, { status: 500 })
  }
}

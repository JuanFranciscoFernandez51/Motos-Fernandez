import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mlGet } from "@/lib/ml/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Webhook de Mercado Libre. Recibe notificaciones cuando pasa algo en
 * items, questions, orders_v2 (este último no aplica a clasificados).
 *
 * Body típico:
 * {
 *   "resource": "/items/MLA1234567890" | "/questions/12345",
 *   "user_id": 123,
 *   "topic": "items" | "questions" | "orders_v2",
 *   ...
 * }
 *
 * IMPORTANTE: ML reintenta hasta 25 veces si no respondemos 200 en 22s.
 * Devolvemos 200 incluso ante error interno para evitar reintentos
 * infinitos. Los errores se loguean en consola del server.
 */
export async function POST(request: Request) {
  let body: WebhookBody = {}
  try {
    body = (await request.json().catch(() => ({}))) as WebhookBody
    console.log("[ML webhook]", JSON.stringify(body))

    // Marcar timestamp para diagnóstico
    await prisma.mLConfig
      .update({
        where: { id: "default" },
        data: { ultimoWebhook: new Date() },
      })
      .catch(() => null)

    // Procesar por topic
    if (body.topic === "questions" && body.resource) {
      await procesarQuestion(body.resource)
    } else if (body.topic === "items" && body.resource) {
      await procesarItem(body.resource)
    }
    // orders_v2 lo ignoramos (clasificados no genera órdenes)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[ML webhook] Error procesando:", e, "Body:", body)
    // Devolver 200 igual para que ML no reintente eternamente
    return NextResponse.json({ ok: false })
  }
}

// ML a veces hace GET de health-check al endpoint
export async function GET() {
  return NextResponse.json({ ok: true, service: "ML webhook" })
}

// ==================== TYPES ====================

type WebhookBody = {
  resource?: string
  user_id?: number
  topic?: string
  application_id?: number
  attempts?: number
  sent?: string
  received?: string
}

type MLQuestion = {
  id: number
  text: string
  status: string
  item_id: string
  from?: { id: number; answered_questions?: number; nickname?: string }
  date_created?: string
}

type MLItem = {
  id: string
  status: string
  permalink?: string
  title?: string
}

// ==================== HANDLERS ====================

/**
 * Cuando alguien pregunta en una publicación, ML manda webhook con
 * resource = "/questions/12345". Levantamos la pregunta, encontramos
 * la moto por mlListingId, y creamos un Lead en el CRM.
 *
 * Idempotente: si ya existe un Lead con esa misma pregunta como nota,
 * no creamos duplicado.
 */
async function procesarQuestion(resource: string) {
  const questionId = resource.replace(/^\/questions\//, "")
  if (!questionId) return
  let q: MLQuestion
  try {
    q = await mlGet<MLQuestion>(`/questions/${questionId}`)
  } catch (e) {
    console.warn(`[ML webhook] No pude traer question ${questionId}:`, e)
    return
  }
  if (!q.text || !q.item_id) return

  // Buscar la moto por mlListingId
  const moto = await prisma.modelo.findUnique({
    where: { mlListingId: q.item_id },
    select: { id: true, marca: true, nombre: true },
  })

  // Idempotencia: si ya hay un Lead con esta question_id en notas, skip
  const existente = await prisma.lead.findFirst({
    where: { notas: { contains: `[ML-Q ${q.id}]` } },
    select: { id: true },
  })
  if (existente) return

  const nickname = q.from?.nickname || `User_${q.from?.id || "ML"}`
  const motoLabel = moto ? `${moto.marca} ${moto.nombre}` : `MLA${q.item_id}`

  await prisma.lead.create({
    data: {
      nombre: nickname,
      apellido: null,
      // Sin email/teléfono — ML no expone esos datos del que pregunta hasta
      // que la conversación pasa a chat directo
      origen: "MERCADOLIBRE",
      temperatura: "CALIENTE",
      etapa: "NUEVO",
      modeloId: moto?.id || null,
      modeloInteres: motoLabel,
      notas: `[ML-Q ${q.id}] ${new Date().toISOString().split("T")[0]} — Pregunta en publicación de ${motoLabel}:\n\n"${q.text}"\n\nResponder desde tu cuenta de Mercado Libre.`,
      interacciones: {
        create: {
          tipo: "pregunta_ml",
          contenido: q.text,
        },
      },
    },
  })
  console.log(`[ML webhook] Lead creado para Q${q.id} (${motoLabel})`)
}

/**
 * Cuando cambia el estado de un item (active → paused, paused → active,
 * etc), sincronizamos el campo mlEstado en nuestro DB.
 */
async function procesarItem(resource: string) {
  const itemId = resource.replace(/^\/items\//, "")
  if (!itemId) return
  let item: MLItem
  try {
    item = await mlGet<MLItem>(`/items/${itemId}?attributes=id,status,permalink,title`)
  } catch (e) {
    console.warn(`[ML webhook] No pude traer item ${itemId}:`, e)
    return
  }
  if (!item.id) return

  // Buscar la moto
  const moto = await prisma.modelo.findUnique({
    where: { mlListingId: item.id },
    select: { id: true, mlEstado: true },
  })
  if (!moto) {
    // Item de ML que no tenemos en DB — ignorar
    return
  }

  if (moto.mlEstado !== item.status) {
    await prisma.modelo.update({
      where: { id: moto.id },
      data: {
        mlEstado: item.status,
        mlPermalink: item.permalink || undefined,
        mlUltimaSync: new Date(),
      },
    })
    console.log(
      `[ML webhook] Item ${item.id}: ${moto.mlEstado} → ${item.status}`
    )
  }
}

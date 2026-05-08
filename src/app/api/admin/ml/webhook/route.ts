import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Webhook de Mercado Libre. Recibe notificaciones cuando pasa algo
 * en items, questions, orders_v2.
 *
 * Body típico:
 * {
 *   "resource": "/items/MLA1234567890",
 *   "user_id": 123,
 *   "topic": "items",
 *   "application_id": ...,
 *   "attempts": 1,
 *   "sent": "...",
 *   "received": "..."
 * }
 *
 * Por ahora SOLO logueamos. En sesiones siguientes:
 * - topic=items: traer la publicación con mlGet y actualizar mlEstado, mlPermalink.
 * - topic=questions: traer la pregunta y guardarla como Lead.
 * - topic=orders_v2: si se vendió, marcar moto como vendida acá.
 *
 * IMPORTANTE: ML reintenta hasta 25 veces si no respondemos 200 en 22s.
 * Por eso respondemos 200 inmediatamente y procesamos en background.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    console.log("[ML webhook]", JSON.stringify(body))

    // Marcar timestamp del último webhook recibido
    await prisma.mLConfig
      .update({
        where: { id: "default" },
        data: { ultimoWebhook: new Date() },
      })
      .catch(() => {
        // Si todavía no hay config (raro), ignorar
      })

    // TODO: enrutar por body.topic y procesar (siguiente sesión)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[ML webhook] Error:", e)
    // Devolver 200 igual para que ML no reintente eternamente
    return NextResponse.json({ ok: false })
  }
}

// ML a veces hace GET de health-check al endpoint
export async function GET() {
  return NextResponse.json({ ok: true, service: "ML webhook" })
}

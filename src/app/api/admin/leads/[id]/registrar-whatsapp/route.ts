import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/leads/[id]/registrar-whatsapp
 * body: { contenido: string }
 * Registra que se le mandó un WhatsApp al lead (interacción) y, si estaba sin
 * contactar, lo pasa a CONTACTADO. Lo usa el botón de WhatsApp-IA de la lista.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const contenido = String(body.contenido || "").trim()
  if (!contenido) return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 })

  await prisma.leadInteraction.create({ data: { leadId: id, tipo: "WHATSAPP", contenido } })
  await prisma.lead.updateMany({ where: { id, etapa: "NUEVO" }, data: { etapa: "CONTACTADO" } })

  revalidatePath("/admin/crm")
  revalidatePath(`/admin/crm/${id}`)
  return NextResponse.json({ ok: true })
}

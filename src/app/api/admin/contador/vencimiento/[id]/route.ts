import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

/**
 * PATCH /api/admin/contador/vencimiento/[id]
 * body: { accion?: "pagar" | "pendiente", monto?, notas?, comprobanteUrl? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (b.accion === "pagar") {
    data.estado = "PAGADO"
    data.pagadoEl = b.pagadoEl ? new Date(b.pagadoEl) : new Date()
  } else if (b.accion === "pendiente") {
    data.estado = "PENDIENTE"
    data.pagadoEl = null
  }
  if ("monto" in b) data.monto = b.monto ? Math.round(Number(b.monto)) : null
  if ("notas" in b) data.notas = b.notas ? String(b.notas).trim() : null
  if ("comprobanteUrl" in b)
    data.comprobanteUrl = b.comprobanteUrl ? String(b.comprobanteUrl).trim() : null

  try {
    const vencimiento = await prisma.vencimiento.update({ where: { id }, data })
    revalidatePath("/admin/contador")
    return NextResponse.json({ ok: true, vencimiento })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 }
    )
  }
}

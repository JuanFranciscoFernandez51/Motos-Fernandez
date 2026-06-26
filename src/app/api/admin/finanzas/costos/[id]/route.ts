import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if ("concepto" in b && b.concepto) data.concepto = String(b.concepto).trim()
  if ("monto" in b) data.monto = Math.max(0, Math.round(Number(b.monto) || 0))
  if ("categoria" in b) data.categoria = b.categoria ? String(b.categoria) : null
  if ("activo" in b) data.activo = !!b.activo
  await prisma.costoFijo.update({ where: { id }, data })
  revalidatePath("/admin/tesoreria/finanzas/costos")
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  await prisma.costoFijo.delete({ where: { id } })
  revalidatePath("/admin/tesoreria/finanzas/costos")
  return NextResponse.json({ ok: true })
}

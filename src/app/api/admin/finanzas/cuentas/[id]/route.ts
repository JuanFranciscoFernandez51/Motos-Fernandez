import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/** PATCH /api/admin/finanzas/cuentas/[id] — editar nombre/saldoInicial/moneda/excluir/activa. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if ("nombre" in b && b.nombre) data.nombre = String(b.nombre).trim()
  if ("moneda" in b && (b.moneda === "ARS" || b.moneda === "USD")) data.moneda = b.moneda
  if ("saldoInicial" in b) data.saldoInicial = Math.round(Number(b.saldoInicial) || 0)
  if ("excluirDeResultado" in b) data.excluirDeResultado = !!b.excluirDeResultado
  if ("activa" in b) data.activa = !!b.activa

  try {
    await prisma.cuentaFinanciera.update({ where: { id }, data })
    revalidatePath("/admin/tesoreria/finanzas/cuentas")
    revalidatePath("/admin/tesoreria/finanzas")
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Ya existe una cuenta con ese nombre" : "Error al guardar"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** DELETE — si tiene movimientos, la desactiva (no se puede borrar); si no, la borra. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const movs = await prisma.movimientoFinanciero.count({ where: { cuentaId: id } })
  try {
    if (movs > 0) {
      await prisma.cuentaFinanciera.update({ where: { id }, data: { activa: false } })
      revalidatePath("/admin/tesoreria/finanzas/cuentas")
      return NextResponse.json({ ok: true, desactivada: true })
    }
    await prisma.cuentaFinanciera.delete({ where: { id } })
    revalidatePath("/admin/tesoreria/finanzas/cuentas")
    revalidatePath("/admin/tesoreria/finanzas")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}

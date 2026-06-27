import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

function revalidar() {
  revalidatePath("/admin/tesoreria/financiaciones")
  revalidatePath("/admin/tesoreria")
  revalidatePath("/admin/finanzas/cuentas-y-cheques")
  revalidatePath("/admin/finanzas")
}

/**
 * PATCH /api/admin/tesoreria/financiaciones/[id]
 * Edición rápida desde la lista de Créditos personales.
 * Campos soportados: descripcion (texto), montoTotal (total del crédito).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const data: { descripcion?: string; montoTotal?: number } = {}

  if (typeof body.descripcion === "string") data.descripcion = body.descripcion.trim()
  if (body.montoTotal != null && !Number.isNaN(Number(body.montoTotal))) {
    data.montoTotal = Math.round(Number(body.montoTotal))
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 })
  }

  try {
    const fin = await prisma.financiacionOC.update({ where: { id }, data })
    revalidar()
    return NextResponse.json({ ok: true, financiacion: { id: fin.id, descripcion: fin.descripcion, montoTotal: fin.montoTotal } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/tesoreria/financiaciones/[id]
 * Elimina el crédito y sus cuotas (cascade). Los avisos quedan con cuotaId null
 * (SetNull). La OC NO se borra: solo se desvincula el crédito.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    // Descartar avisos programados de las cuotas de este crédito (limpieza).
    const cuotas = await prisma.cuotaFinanciacion.findMany({ where: { financiacionId: id }, select: { id: true } })
    const cuotaIds = cuotas.map((c) => c.id)
    if (cuotaIds.length) {
      await prisma.outreachTarea.updateMany({
        where: { cuotaId: { in: cuotaIds }, estado: "PROGRAMADA" },
        data: { estado: "DESCARTADA", descartadaAt: new Date(), notaInterna: "Crédito eliminado." },
      })
    }
    await prisma.financiacionOC.delete({ where: { id } })
    revalidar()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al eliminar" }, { status: 500 })
  }
}

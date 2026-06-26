import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

/**
 * PATCH /api/admin/finanzas/movimientos/[id]
 * Edición inline. Para movimientos de TRANSFERENCIA solo se permite editar
 * categoria/descripcion/registrado/observaciones (no monto ni cuenta, porque
 * desincronizaría las dos patas; eso se borra y se rehace).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))

  const actual = await prisma.movimientoFinanciero.findUnique({
    where: { id },
    select: { tipo: true, transferenciaId: true },
  })
  if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  const esTransfer = actual.tipo === "TRANSFERENCIA" || !!actual.transferenciaId

  const data: Record<string, unknown> = {}
  if ("categoria" in b && !esTransfer) data.categoria = String(b.categoria)
  if ("descripcion" in b) data.descripcion = String(b.descripcion ?? "")
  if ("registrado" in b) data.registrado = !!b.registrado
  if ("observaciones" in b) data.observaciones = b.observaciones ? String(b.observaciones) : null
  if ("comprobante" in b) data.comprobante = b.comprobante ? String(b.comprobante) : null
  if ("fecha" in b && b.fecha) data.fecha = fechaDeInput(String(b.fecha))

  if (!esTransfer) {
    if ("monto" in b) {
      const n = Math.round(Number(b.monto))
      if (Number.isFinite(n) && n > 0) data.monto = n
    }
    if ("tipo" in b && (b.tipo === "INGRESO" || b.tipo === "GASTO")) data.tipo = b.tipo
    if ("cuentaId" in b && b.cuentaId) {
      const cuenta = await prisma.cuentaFinanciera.findUnique({
        where: { id: String(b.cuentaId) },
        select: { moneda: true },
      })
      if (cuenta) {
        data.cuentaId = String(b.cuentaId)
        data.moneda = cuenta.moneda
      }
    }
  }

  try {
    await prisma.movimientoFinanciero.update({ where: { id }, data })
    revalidatePath("/admin/tesoreria/finanzas")
    revalidatePath("/admin/tesoreria/finanzas/movimientos")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 }
    )
  }
}

/** DELETE — borra el movimiento (y la otra pata si es transferencia). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const mov = await prisma.movimientoFinanciero.findUnique({
    where: { id },
    select: { transferenciaId: true },
  })
  if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  try {
    if (mov.transferenciaId) {
      await prisma.movimientoFinanciero.deleteMany({
        where: { transferenciaId: mov.transferenciaId },
      })
    } else {
      await prisma.movimientoFinanciero.delete({ where: { id } })
    }
    revalidatePath("/admin/tesoreria/finanzas")
    revalidatePath("/admin/tesoreria/finanzas/movimientos")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al borrar" },
      { status: 500 }
    )
  }
}

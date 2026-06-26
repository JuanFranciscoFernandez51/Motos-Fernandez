import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/admin/finanzas/cxc/[id]
 * body: { accion: "cobrar" | "pendiente" | "anular", cuentaId?, registrado? }
 * Si accion="cobrar" y viene cuentaId → además registra el movimiento de caja
 * (INGRESO si COBRAR, GASTO si PAGAR) para cerrar el círculo.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const cxc = await prisma.cuentaPorCobrar.findUnique({ where: { id } })
  if (!cxc) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  try {
    if (b.accion === "cobrar") {
      await prisma.cuentaPorCobrar.update({
        where: { id },
        data: { estado: "COBRADO", fechaCobro: new Date() },
      })
      if (b.cuentaId) {
        await prisma.movimientoFinanciero.create({
          data: {
            fecha: new Date(),
            tipo: cxc.sentido === "COBRAR" ? "INGRESO" : "GASTO",
            categoria: cxc.sentido === "COBRAR" ? "Otros ingresos" : "Otros gastos",
            descripcion: `${cxc.tipo} — ${cxc.cliente}`,
            monto: cxc.monto,
            moneda: cxc.moneda,
            registrado: b.registrado ?? true,
            cuentaId: String(b.cuentaId),
            observaciones: "Generado al cobrar/pagar una cuenta pendiente",
          },
        })
      }
    } else if (b.accion === "pendiente") {
      await prisma.cuentaPorCobrar.update({ where: { id }, data: { estado: "PENDIENTE", fechaCobro: null } })
    } else if (b.accion === "anular") {
      await prisma.cuentaPorCobrar.update({ where: { id }, data: { estado: "ANULADO" } })
    }
    revalidatePath("/admin/tesoreria/finanzas/cuentas-cheques")
    revalidatePath("/admin/tesoreria/finanzas")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  await prisma.cuentaPorCobrar.delete({ where: { id } })
  revalidatePath("/admin/tesoreria/finanzas/cuentas-cheques")
  return NextResponse.json({ ok: true })
}

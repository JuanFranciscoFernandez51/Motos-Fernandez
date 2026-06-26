import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH — concretar (cobrado/pagado, opcionalmente registra movimiento) o anular.
 * body: { accion: "concretar" | "anular" | "pendiente", cuentaId?, registrado? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const cheque = await prisma.cheque.findUnique({ where: { id } })
  if (!cheque) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  try {
    if (b.accion === "concretar") {
      await prisma.cheque.update({
        where: { id },
        data: { estado: "CONCRETADO", fechaConcretado: new Date() },
      })
      if (b.cuentaId) {
        await prisma.movimientoFinanciero.create({
          data: {
            fecha: new Date(),
            tipo: cheque.tipo === "A_COBRAR" ? "INGRESO" : "GASTO",
            categoria: cheque.tipo === "A_COBRAR" ? "Otros ingresos" : "Otros gastos",
            descripcion: `Cheque ${cheque.formato} — ${cheque.beneficiario}`,
            monto: cheque.monto,
            moneda: cheque.moneda,
            registrado: b.registrado ?? true,
            cuentaId: String(b.cuentaId),
            observaciones: "Generado al concretar un cheque",
          },
        })
      }
    } else if (b.accion === "anular") {
      await prisma.cheque.update({ where: { id }, data: { estado: "ANULADO" } })
    } else if (b.accion === "pendiente") {
      await prisma.cheque.update({ where: { id }, data: { estado: "PENDIENTE", fechaConcretado: null } })
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
  await prisma.cheque.delete({ where: { id } })
  revalidatePath("/admin/tesoreria/finanzas/cuentas-cheques")
  return NextResponse.json({ ok: true })
}

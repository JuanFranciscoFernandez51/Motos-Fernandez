import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { fechaDeInput } from "@/lib/finanzas"

/** PATCH → editar cheque o marcar concretado/anulado. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const data: Record<string, unknown> = {}
    if ("beneficiario" in b) data.beneficiario = b.beneficiario
    if ("monto" in b) data.monto = Math.abs(Math.round(Number(b.monto)))
    if ("fechaVencimiento" in b) data.fechaVencimiento = fechaDeInput(b.fechaVencimiento)
    if ("formato" in b) data.formato = b.formato || "E-Cheq"
    if ("observaciones" in b) data.observaciones = b.observaciones || null
    if ("estado" in b) {
      data.estado = b.estado
      data.fechaConcretado = b.estado === "CONCRETADO" ? new Date() : null
    }
    const cheque = await prisma.cheque.update({ where: { id }, data })

    // Cerrar el círculo: registrar el movimiento de caja al concretar
    if (b.estado === "CONCRETADO" && b.crearMovimiento && b.cuentaId) {
      const cuenta = await prisma.cuentaFinanciera.findUnique({ where: { id: b.cuentaId } })
      if (cuenta) {
        const esCobrar = cheque.tipo === "A_COBRAR"
        await prisma.movimientoFinanciero.create({
          data: {
            fecha: fechaDeInput(new Date()),
            tipo: esCobrar ? "INGRESO" : "GASTO",
            categoria: esCobrar ? "Otros Ingresos" : "Otros Gastos",
            descripcion: `Cheque ${cheque.beneficiario}`,
            monto: cheque.monto,
            moneda: cuenta.moneda,
            cuentaId: cuenta.id,
            observaciones: esCobrar ? "Cheque cobrado" : "Cheque pagado",
          },
        })
      }
    }
    revalidatePath("/admin/finanzas")
    return NextResponse.json(cheque)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.cheque.delete({ where: { id } })
    revalidatePath("/admin/finanzas")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

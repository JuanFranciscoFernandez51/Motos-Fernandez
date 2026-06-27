import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { fechaDeInput } from "@/lib/finanzas"

// Categoría de movimiento sugerida según el tipo de cuenta a cobrar/pagar
const CAT_COBRAR: Record<string, string> = {
  "Indumentaria": "Indumentaria Vespa", "Accesorios": "Accesorios de Moto",
  "Reparaciones": "Servicio Técnico / Taller", "Crédito personal": "Venta de Motos",
  "Crédito prendario": "Venta de Motos", "Liberación de tarjeta": "Venta de Motos",
}
const CAT_PAGAR: Record<string, string> = {
  "Compra de moto": "Compra de Stock (Motos)", "Compra de stock": "Compra de Stock (Accesorios/Indumentaria)",
  "Impuestos": "Impuestos", "Sueldos": "Sueldos y Cargas Sociales", "Préstamo / banco": "Gastos Bancarios",
}

/** PATCH → editar o marcar cobrada/anulada/pendiente. Opcional: crear movimiento de caja. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const data: Record<string, unknown> = {}
    if ("cliente" in b) data.cliente = String(b.cliente).trim()
    if ("tipo" in b) data.tipo = b.tipo
    if ("descripcion" in b) data.descripcion = b.descripcion || null
    if ("monto" in b) data.monto = Math.abs(Math.round(Number(b.monto)))
    if ("moneda" in b) data.moneda = b.moneda === "USD" ? "USD" : "ARS"
    if ("fechaVencimiento" in b) data.fechaVencimiento = b.fechaVencimiento ? fechaDeInput(b.fechaVencimiento) : null
    if ("observaciones" in b) data.observaciones = b.observaciones || null
    if ("estado" in b) {
      data.estado = b.estado
      data.fechaCobro = b.estado === "COBRADO" ? new Date() : null
    }
    const cobro = await prisma.cuentaPorCobrar.update({ where: { id }, data })

    // Cerrar el círculo: si se marcó cobrada/pagada y pidió registrar el movimiento de caja
    if (b.estado === "COBRADO" && b.crearMovimiento && b.cuentaId) {
      const cuenta = await prisma.cuentaFinanciera.findUnique({ where: { id: b.cuentaId } })
      if (cuenta) {
        const esCobrar = cobro.sentido === "COBRAR"
        await prisma.movimientoFinanciero.create({
          data: {
            fecha: fechaDeInput(new Date()),
            tipo: esCobrar ? "INGRESO" : "GASTO",
            categoria: esCobrar ? (CAT_COBRAR[cobro.tipo] || "Otros Ingresos") : (CAT_PAGAR[cobro.tipo] || "Otros Gastos"),
            descripcion: `${cobro.cliente}${cobro.descripcion ? " — " + cobro.descripcion : ""}`,
            monto: cobro.monto,
            moneda: cuenta.moneda,
            cuentaId: cuenta.id,
            observaciones: esCobrar ? "Cobro de cuenta a cobrar" : "Pago de cuenta a pagar",
          },
        })
      }
    }
    revalidatePath("/admin/finanzas")
    return NextResponse.json(cobro)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.cuentaPorCobrar.delete({ where: { id } })
    revalidatePath("/admin/finanzas")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

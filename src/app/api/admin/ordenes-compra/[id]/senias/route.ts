import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireSection } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

function revalidar(ocId: string) {
  revalidatePath(`/admin/ordenes-compra/${ocId}`)
  revalidatePath("/admin/ordenes-compra")
  revalidatePath("/admin/finanzas")
  revalidatePath("/admin/finanzas/movimientos")
}

/**
 * POST /api/admin/ordenes-compra/[id]/senias
 * Registra una seña / entrega a cuenta sobre una OC (antes de concretar).
 * body: { monto, moneda?, metodo, fecha?, detalle?, registrarEnCaja?, cuentaId? }
 * Si registrarEnCaja + cuentaId → crea un MovimientoFinanciero (INGRESO) atado.
 * Si la OC está en BORRADOR, pasa a RESERVADA.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSection("ORDENES_COMPRA")
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))

  const monto = Math.round(Number(b.monto))
  if (!Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 })
  }
  const moneda = String(b.moneda) === "USD" ? "USD" : "ARS"
  const metodo = String(b.metodo || "EFECTIVO").trim().toUpperCase()
  const fecha = b.fecha ? fechaDeInput(String(b.fecha)) : new Date()
  const detalle = b.detalle ? String(b.detalle).trim() : null

  const orden = await prisma.ordenCompra.findUnique({
    where: { id },
    select: { id: true, estado: true, cliente: { select: { nombre: true, apellido: true } }, motoDescripcion: true },
  })
  if (!orden) return NextResponse.json({ error: "OC no encontrada" }, { status: 404 })

  try {
    const senia = await prisma.$transaction(async (tx) => {
      // Registro opcional en la caja de Finanzas.
      let movimientoFinancieroId: string | null = null
      if (b.registrarEnCaja && b.cuentaId) {
        const cuenta = await tx.cuentaFinanciera.findUnique({ where: { id: String(b.cuentaId) } })
        if (cuenta) {
          const cli = `${orden.cliente.apellido}, ${orden.cliente.nombre}`
          const mov = await tx.movimientoFinanciero.create({
            data: {
              fecha,
              tipo: "INGRESO",
              categoria: "Seña / a cuenta",
              descripcion: `Seña ${orden.motoDescripcion} — ${cli}`.trim(),
              monto,
              moneda: cuenta.moneda,
              cuentaId: cuenta.id,
              observaciones: "Seña de OC (entrega a cuenta)",
            },
          })
          movimientoFinancieroId = mov.id
        }
      }

      const creada = await tx.oCSenia.create({
        data: { ordenCompraId: id, monto, moneda, metodo, fecha, detalle, movimientoFinancieroId },
      })

      // BORRADOR → RESERVADA al registrar la primera seña.
      if (orden.estado === "BORRADOR") {
        await tx.ordenCompra.update({ where: { id }, data: { estado: "RESERVADA" } })
      }
      return creada
    })

    revalidar(id)
    return NextResponse.json({ ok: true, senia })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 })
  }
}

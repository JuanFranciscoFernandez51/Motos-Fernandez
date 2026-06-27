import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { cobrarProximaCuota } from "@/lib/financiacion-helpers"

/**
 * POST /api/admin/finanzas/creditos/[id]/cobrar
 * Cobra la próxima cuota de una financiación (crédito personal) DESDE Finanzas.
 * Usa el mismo helper que Tesorería → queda espejado en ambos lados.
 * body opcional: { crearMovimiento?: boolean, cuentaId?: string } para cerrar
 * el círculo registrando el ingreso en la caja.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))

  try {
    const cuota = await cobrarProximaCuota(prisma, id)
    if (!cuota) {
      return NextResponse.json({ error: "No hay cuotas pendientes" }, { status: 400 })
    }

    // Cerrar el círculo: registrar el ingreso en la caja de Finanzas (opcional)
    if (b.crearMovimiento && b.cuentaId) {
      const [cuenta, fin] = await Promise.all([
        prisma.cuentaFinanciera.findUnique({ where: { id: String(b.cuentaId) } }),
        prisma.financiacionOC.findUnique({
          where: { id },
          select: { cliente: { select: { nombre: true, apellido: true } } },
        }),
      ])
      if (cuenta) {
        const nombreCli = fin ? `${fin.cliente.apellido}, ${fin.cliente.nombre}` : ""
        await prisma.movimientoFinanciero.create({
          data: {
            fecha: new Date(),
            tipo: "INGRESO",
            categoria: "Cuota de crédito",
            descripcion: `Cuota ${cuota.numero} — ${nombreCli}`.trim(),
            monto: cuota.monto,
            moneda: cuenta.moneda,
            cuentaId: cuenta.id,
            observaciones: "Cobro de cuota de crédito personal",
          },
        })
      }
    }

    revalidatePath("/admin/finanzas/cuentas-y-cheques")
    revalidatePath("/admin/finanzas")
    revalidatePath("/admin/tesoreria/financiaciones")
    return NextResponse.json({ ok: true, cuota })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cobrar" },
      { status: 500 }
    )
  }
}

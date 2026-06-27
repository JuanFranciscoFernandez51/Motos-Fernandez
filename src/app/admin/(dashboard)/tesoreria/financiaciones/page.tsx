import Link from "next/link"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { FinanciacionesList } from "./financiaciones-list"
import { actualizarEstadosVencidos } from "@/lib/financiacion-helpers"

export const dynamic = "force-dynamic"

/**
 * Cobra (marca pagada) la PRÓXIMA cuota pendiente/atrasada de una financiación
 * directo desde la lista — pago en efectivo, fecha de hoy. Para registrar otro
 * método/fecha o adjuntar comprobante, se entra al detalle.
 */
async function cobrarProximaCuota(financiacionId: string) {
  "use server"
  const proxima = await prisma.cuotaFinanciacion.findFirst({
    where: { financiacionId, estado: { in: ["PENDIENTE", "ATRASADA"] } },
    orderBy: { fechaVencimiento: "asc" },
    select: { id: true },
  })
  if (!proxima) return

  await prisma.cuotaFinanciacion.update({
    where: { id: proxima.id },
    data: { estado: "PAGADA", fechaPago: new Date(), metodoPago: "Efectivo" },
  })
  // Cancelar avisos pendientes de esa cuota
  await prisma.outreachTarea.updateMany({
    where: { cuotaId: proxima.id, estado: "PROGRAMADA" },
    data: {
      estado: "DESCARTADA",
      descartadaAt: new Date(),
      notaInterna: "Cancelada automaticamente: la cuota fue pagada.",
    },
  })
  // Recalcular el estado de la financiación
  const allCuotas = await prisma.cuotaFinanciacion.findMany({
    where: { financiacionId },
    select: { estado: true },
  })
  const allPagadas = allCuotas.every((c) => c.estado === "PAGADA" || c.estado === "CANCELADA")
  const hayAtrasada = allCuotas.some((c) => c.estado === "ATRASADA")
  await prisma.financiacionOC.update({
    where: { id: financiacionId },
    data: { estado: allPagadas ? "COMPLETADA" : hayAtrasada ? "ATRASADA" : "ACTIVA" },
  })

  revalidatePath("/admin/tesoreria/financiaciones")
  revalidatePath("/admin/tesoreria")
}

export default async function FinanciacionesPage() {
  // Mantener estados actualizados antes de mostrar
  await actualizarEstadosVencidos(prisma)

  const financiaciones = await prisma.financiacionOC.findMany({
    include: {
      cliente: {
        select: { id: true, nombre: true, apellido: true, telefono: true, dni: true },
      },
      cuotas: {
        select: { id: true, estado: true, monto: true, fechaVencimiento: true, fechaPago: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = financiaciones.map((f) => {
    const cuotasPagadas = f.cuotas.filter((c) => c.estado === "PAGADA").length
    const cuotasAtrasadas = f.cuotas.filter((c) => c.estado === "ATRASADA").length
    const proximaCuota = f.cuotas
      .filter((c) => c.estado === "PENDIENTE" || c.estado === "ATRASADA")
      .sort(
        (a, b) =>
          new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
      )[0]
    const saldoPendiente = f.cuotas
      .filter((c) => c.estado !== "PAGADA" && c.estado !== "CANCELADA")
      .reduce((s, c) => s + c.monto, 0)
    return {
      id: f.id,
      numero: f.numero,
      descripcion: f.descripcion || "—",
      clienteId: f.cliente.id,
      clienteNombre: `${f.cliente.apellido}, ${f.cliente.nombre}`,
      clienteTelefono: f.cliente.telefono,
      clienteDni: f.cliente.dni,
      montoTotal: f.montoTotal,
      moneda: f.moneda,
      cantidadCuotas: f.cantidadCuotas,
      cuotasPagadas,
      cuotasAtrasadas,
      saldoPendiente,
      proximaCuotaFecha: proximaCuota?.fechaVencimiento ?? null,
      proximaCuotaMonto: proximaCuota?.monto ?? null,
      estado: f.estado,
      origen: f.origen,
      fechaInicio: f.fechaInicio,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Créditos personales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Lo que los clientes nos deben en cuotas. Se crean solos cuando una OC
            tiene financiación; podés cobrar la cuota y avisar al cliente desde acá.
          </p>
        </div>
        <Button
          render={<Link href="/admin/tesoreria/financiaciones/nueva" />}
          className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva financiación
        </Button>
      </div>

      <FinanciacionesList rows={rows} cobrarProximaCuota={cobrarProximaCuota} />
    </div>
  )
}

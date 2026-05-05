import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { FinanciacionesList } from "./financiaciones-list"
import { actualizarEstadosVencidos } from "@/lib/financiacion-helpers"

export const dynamic = "force-dynamic"

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financiaciones</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Seguimiento de pagos de financiación. Las financiaciones se crean
            automáticamente cuando una OC tiene cuotas; también podés cargar manualmente.
          </p>
        </div>
        <Button
          render={<Link href="/admin/tesoreria/financiaciones/nueva" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva financiación
        </Button>
      </div>

      <FinanciacionesList rows={rows} />
    </div>
  )
}

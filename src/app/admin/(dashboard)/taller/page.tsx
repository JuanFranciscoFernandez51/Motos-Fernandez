import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus, Wrench, ListOrdered } from "lucide-react"
import { OrdenesList } from "./ordenes-list"
import { nombreCompleto } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

export default async function TallerPage() {
  const ordenes = await prisma.ordenTrabajo.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { nombre: true, apellido: true, dni: true, telefono: true } },
      tipoServicio: { select: { nombre: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wrench className="size-6 text-[#6B4F7A]" />
            Taller
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Órdenes de trabajo, diagnósticos, presupuestos y service.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/admin/taller/tipos-servicio" />}
            variant="outline"
          >
            <ListOrdered className="h-4 w-4 mr-2" />
            Tipos de servicio
          </Button>
          <Button
            render={<Link href="/admin/taller/nueva" />}
            className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva OT
          </Button>
        </div>
      </div>

      <OrdenesList
        ordenes={ordenes.map((ot) => ({
          id: ot.id,
          numero: ot.numero,
          estado: ot.estado,
          motoMarca: ot.motoMarca,
          motoModelo: ot.motoModelo,
          motoPatente: ot.motoPatente,
          total: ot.total,
          saldo: ot.saldo,
          fechaIngreso: ot.fechaIngreso,
          fechaPrometida: ot.fechaPrometida,
          clienteNombre: nombreCompleto(ot.cliente),
          clienteTelefono: ot.cliente.telefono,
          tipoServicio: ot.tipoServicio?.nombre ?? null,
        }))}
      />
    </div>
  )
}

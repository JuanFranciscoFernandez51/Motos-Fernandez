import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { OCList } from "./oc-list"
import { nombreCompleto } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

export default async function OrdenesCompraPage() {
  const ordenes = await prisma.ordenCompra.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { nombre: true, apellido: true, dni: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Órdenes de compra</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historial de ventas concretadas, reservas con seña y borradores.
          </p>
        </div>
        <Button
          render={<Link href="/admin/ordenes-compra/nueva" />}
          className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva OC
        </Button>
      </div>

      <OCList
        ordenes={ordenes.map((o) => ({
          id: o.id,
          numero: o.numero,
          estado: o.estado,
          motoDescripcion: o.motoDescripcion,
          precioVenta: o.precioVenta,
          moneda: o.moneda,
          formaPago: o.formaPago,
          fecha: o.fecha,
          clienteNombre: nombreCompleto(o.cliente),
          clienteDni: o.cliente.dni,
        }))}
      />
    </div>
  )
}

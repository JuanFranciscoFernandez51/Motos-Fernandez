import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { VentasList } from "./ventas-list"
import { nombreCompleto } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

export default async function VentasPage() {
  const ventas = await prisma.ventaMoto.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { nombre: true, apellido: true, dni: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de ventas concretadas, reservas con seña y borradores.
          </p>
        </div>
        <Button
          render={<Link href="/admin/ventas/nueva" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva venta
        </Button>
      </div>

      <VentasList
        ventas={ventas.map((v) => ({
          id: v.id,
          numero: v.numero,
          estado: v.estado,
          motoDescripcion: v.motoDescripcion,
          precioVenta: v.precioVenta,
          moneda: v.moneda,
          formaPago: v.formaPago,
          fecha: v.fecha,
          clienteNombre: nombreCompleto(v.cliente),
          clienteDni: v.cliente.dni,
        }))}
      />
    </div>
  )
}

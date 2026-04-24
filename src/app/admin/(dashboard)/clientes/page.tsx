import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ClientesList } from "./clientes-list"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      dni: true,
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
      ciudad: true,
      createdAt: true,
      _count: {
        select: {
          mandatos: true,
          ventas: true,
          ordenesTrabajo: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Base única de clientes. Se conecta con mandatos, ventas y taller.
          </p>
        </div>
        <Button
          render={<Link href="/admin/clientes/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>

      <ClientesList clientes={clientes} />
    </div>
  )
}

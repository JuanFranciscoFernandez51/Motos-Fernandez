import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { ModelosList } from "./modelos-list"

export const dynamic = "force-dynamic"

async function toggleActivo(id: string, activoActual: boolean) {
  "use server"
  await prisma.modelo.update({
    where: { id },
    data: { activo: !activoActual },
  })
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  revalidatePath("/")
}

export default async function ModelosPage() {
  const modelos = await prisma.modelo.findMany({
    orderBy: [{ slug: "asc" }],
    select: {
      id: true,
      nombre: true,
      slug: true,
      marca: true,
      categoriaVehiculo: true,
      condicion: true,
      anio: true,
      precio: true,
      fotos: true,
      activo: true,
      orden: true,
      cilindrada: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioná el catálogo de motos, cuatriciclos y vehículos.
          </p>
        </div>
        <Button
          render={<Link href="/admin/modelos/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo modelo
        </Button>
      </div>

      <ModelosList modelos={modelos} toggleActivo={toggleActivo} />
    </div>
  )
}

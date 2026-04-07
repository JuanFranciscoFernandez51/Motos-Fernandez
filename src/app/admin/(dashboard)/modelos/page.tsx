import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { formatPrice, CATEGORIA_VEHICULO_LABELS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

async function toggleModeloActivo(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const activo = formData.get("activo") === "true"
  await prisma.modelo.update({
    where: { id },
    data: { activo: !activo },
  })
  revalidatePath("/admin/modelos")
}

export default async function ModelosPage() {
  const modelos = await prisma.modelo.findMany({
    orderBy: { orden: "asc" },
    include: { colores: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {modelos.length} modelo(s) cargados
          </p>
        </div>
        <Button render={<Link href="/admin/modelos/nuevo" />} className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo modelo
        </Button>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead className="w-20">Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No hay modelos cargados
                </TableCell>
              </TableRow>
            ) : (
              modelos.map((modelo) => (
                <TableRow key={modelo.id}>
                  <TableCell className="font-mono text-sm">{modelo.orden}</TableCell>
                  <TableCell>
                    {modelo.fotos[0] ? (
                      <Image
                        src={modelo.fotos[0]}
                        alt={modelo.nombre}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        Sin foto
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{modelo.nombre}</p>
                      <p className="text-xs text-gray-500">{modelo.cilindrada || modelo.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{modelo.marca}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {CATEGORIA_VEHICULO_LABELS[modelo.categoriaVehiculo] || modelo.categoriaVehiculo}
                    </span>
                  </TableCell>
                  <TableCell>
                    {modelo.precio ? formatPrice(modelo.precio) : <span className="text-gray-400">Consultar</span>}
                  </TableCell>
                  <TableCell>
                    <form action={toggleModeloActivo}>
                      <input type="hidden" name="id" value={modelo.id} />
                      <input type="hidden" name="activo" value={String(modelo.activo)} />
                      <button type="submit">
                        <Badge
                          variant="secondary"
                          className={
                            modelo.activo
                              ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {modelo.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" render={<Link href={`/admin/modelos/${modelo.id}`} />}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { TiposServicioList } from "./tipos-servicio-list"

export const dynamic = "force-dynamic"

async function crearTipo(formData: FormData) {
  "use server"
  const nombre = (formData.get("nombre") as string).trim()
  const descripcion = (formData.get("descripcion") as string) || null
  const precioBaseStr = formData.get("precioBase") as string
  const duracionMinStr = formData.get("duracionMin") as string

  if (!nombre) return { error: "El nombre es obligatorio" }

  try {
    await prisma.tipoServicio.create({
      data: {
        nombre,
        descripcion: descripcion && descripcion.trim() ? descripcion : null,
        precioBase: precioBaseStr ? parseInt(precioBaseStr) : null,
        duracionMin: duracionMinStr ? parseInt(duracionMinStr) : null,
      },
    })
    revalidatePath("/admin/taller/tipos-servicio")
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    if (msg.includes("Unique")) return { error: "Ya existe un tipo con ese nombre" }
    return { error: msg }
  }
}

async function actualizarTipo(id: string, formData: FormData) {
  "use server"
  const nombre = (formData.get("nombre") as string).trim()
  const descripcion = (formData.get("descripcion") as string) || null
  const precioBaseStr = formData.get("precioBase") as string
  const duracionMinStr = formData.get("duracionMin") as string
  const activo = formData.get("activo") === "true"

  await prisma.tipoServicio.update({
    where: { id },
    data: {
      nombre,
      descripcion: descripcion && descripcion.trim() ? descripcion : null,
      precioBase: precioBaseStr ? parseInt(precioBaseStr) : null,
      duracionMin: duracionMinStr ? parseInt(duracionMinStr) : null,
      activo,
    },
  })
  revalidatePath("/admin/taller/tipos-servicio")
  return {}
}

async function eliminarTipo(id: string) {
  "use server"
  await prisma.tipoServicio.delete({ where: { id } })
  revalidatePath("/admin/taller/tipos-servicio")
}

export default async function TiposServicioPage() {
  const tipos = await prisma.tipoServicio.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { ordenes: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/taller" />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de servicio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo de servicios que hace el taller (service, cambio aceite, reparación, etc.)
          </p>
        </div>
      </div>

      <TiposServicioList
        tipos={tipos.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          descripcion: t.descripcion,
          precioBase: t.precioBase,
          duracionMin: t.duracionMin,
          activo: t.activo,
          ordenesCount: t._count.ordenes,
        }))}
        crearTipo={crearTipo}
        actualizarTipo={actualizarTipo}
        eliminarTipo={eliminarTipo}
      />
    </div>
  )
}

import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProveedorForm } from "@/components/admin/operativo/proveedor-form"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

async function updateProveedor(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
    const get = (k: string) => (formData.get(k) as string) || ""
    await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: get("nombre"),
        contacto: get("contacto") || null,
        telefono: get("telefono") || null,
        email: get("email") || null,
        cuit: get("cuit") || null,
        direccion: get("direccion") || null,
        ciudad: get("ciudad") || null,
        rubro: get("rubro") || null,
        sitio: get("sitio") || null,
        notas: get("notas") || null,
        activo: get("activo") === "true",
      },
    })
    revalidatePath("/admin/proveedores")
    return {}
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Error al actualizar",
    }
  }
}

async function deleteProveedor(id: string) {
  "use server"
  // Desasocia de modelos y productos, luego elimina
  await prisma.modelo.updateMany({
    where: { proveedorId: id },
    data: { proveedorId: null },
  })
  await prisma.producto.updateMany({
    where: { proveedorId: id },
    data: { proveedorId: null },
  })
  await prisma.proveedor.delete({ where: { id } })
  revalidatePath("/admin/proveedores")
  redirect("/admin/proveedores")
}

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      _count: { select: { modelos: true, productos: true } },
    },
  })
  if (!proveedor) notFound()

  const initialData = {
    id: proveedor.id,
    nombre: proveedor.nombre,
    contacto: proveedor.contacto || "",
    telefono: proveedor.telefono || "",
    email: proveedor.email || "",
    cuit: proveedor.cuit || "",
    direccion: proveedor.direccion || "",
    ciudad: proveedor.ciudad || "",
    rubro: proveedor.rubro || "",
    sitio: proveedor.sitio || "",
    notas: proveedor.notas || "",
    activo: proveedor.activo,
  }

  return (
    <div className="space-y-6">
      <ProveedorForm initialData={initialData} saveAction={updateProveedor} />

      <div className="rounded-lg border bg-red-50/40 border-red-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-900">Eliminar proveedor</p>
          <p className="text-xs text-red-700">
            Se desasocian los modelos ({proveedor._count.modelos}) y productos (
            {proveedor._count.productos}) que lo tenían asignado.
          </p>
        </div>
        <form action={deleteProveedor.bind(null, proveedor.id)}>
          <Button
            type="submit"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <Trash2 className="size-4 mr-1" /> Eliminar
          </Button>
        </form>
      </div>
    </div>
  )
}

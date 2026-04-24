import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProveedorForm } from "@/components/admin/operativo/proveedor-form"

export const dynamic = "force-dynamic"

async function createProveedor(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const proveedor = await prisma.proveedor.create({
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
    return { id: proveedor.id }
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Error al crear proveedor",
    }
  }
}

export default function NuevoProveedorPage() {
  return <ProveedorForm saveAction={createProveedor} />
}

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ProveedorForm } from "@/components/admin/operativo/proveedor-form"

export const dynamic = "force-dynamic"

async function createProveedor(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""

    // Parsear contactos del JSON
    let contactos: unknown = null
    const contactosRaw = get("contactos")
    if (contactosRaw) {
      try {
        const parsed = JSON.parse(contactosRaw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          contactos = parsed
        }
      } catch {
        // Ignorar JSON inválido
      }
    }

    // Compatibilidad: si hay contactos, usar el primero como "contacto principal" legacy
    let contactoPrincipal: string | null = null
    let telefonoPrincipal: string | null = null
    if (contactos && Array.isArray(contactos) && contactos.length > 0) {
      const primero = contactos[0] as { nombre?: string; rol?: string; telefono?: string }
      if (primero?.nombre) {
        contactoPrincipal = primero.rol
          ? `${primero.nombre} (${primero.rol})`
          : primero.nombre
      }
      if (primero?.telefono) telefonoPrincipal = primero.telefono
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: get("nombre"),
        contacto: contactoPrincipal,
        telefono: telefonoPrincipal,
        email: get("email") || null,
        cuit: get("cuit") || null,
        direccion: get("direccion") || null,
        ciudad: get("ciudad") || null,
        rubro: get("rubro") || null,
        sitio: get("sitio") || null,
        notas: get("notas") || null,
        activo: get("activo") === "true",
        contactos: contactos as never,
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

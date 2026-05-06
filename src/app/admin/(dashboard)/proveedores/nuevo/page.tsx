import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { ProveedorForm } from "@/components/admin/operativo/proveedor-form"

export const dynamic = "force-dynamic"

type ContactoInput = {
  id?: string
  nombre?: string
  rol?: string
  telefono?: string
  email?: string
}

function parseJsonArray(raw: string): unknown[] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // ignore
  }
  return null
}

async function createProveedor(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""

    const contactos = parseJsonArray(get("contactos")) as ContactoInput[] | null
    const cuentasBancarias = parseJsonArray(get("cuentasBancarias"))
    const listaPrecios = parseJsonArray(get("listaPrecios"))

    // Compatibilidad: usar primer contacto como principal legacy
    let contactoPrincipal: string | null = null
    let telefonoPrincipal: string | null = null
    if (contactos && contactos.length > 0) {
      const primero = contactos[0]
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
        contactos: contactos
          ? (contactos as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        cuentasBancarias: cuentasBancarias
          ? (cuentasBancarias as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        listaPrecios: listaPrecios
          ? (listaPrecios as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
    revalidatePath("/admin/proveedores")
    return { id: proveedor.id }
  } catch (e: unknown) {
    console.error("Error creando proveedor:", e)
    return {
      error: e instanceof Error ? e.message : "Error al crear proveedor",
    }
  }
}

export default function NuevoProveedorPage() {
  return <ProveedorForm saveAction={createProveedor} />
}

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { ClienteForm } from "@/components/admin/operativo/cliente-form"

export const dynamic = "force-dynamic"

async function createCliente(formData: FormData) {
  "use server"
  try {
    const data: Record<string, string | null | Date> = {}
    const fields = [
      "dni",
      "cuit",
      "nombre",
      "apellido",
      "email",
      "telefono",
      "telefonoAlt",
      "direccion",
      "ciudad",
      "provincia",
      "codigoPostal",
      "ocupacion",
      "notasInternas",
    ]
    for (const f of fields) {
      const v = formData.get(f) as string
      data[f] = v && v.trim() ? v.trim() : null
    }

    const cliente = await prisma.cliente.create({
      data: {
        dni: data.dni as string | null,
        cuit: data.cuit as string | null,
        nombre: data.nombre as string,
        apellido: data.apellido as string,
        email: data.email as string | null,
        telefono: data.telefono as string | null,
        telefonoAlt: data.telefonoAlt as string | null,
        direccion: data.direccion as string | null,
        ciudad: data.ciudad as string | null,
        provincia: data.provincia as string | null,
        codigoPostal: data.codigoPostal as string | null,
        ocupacion: data.ocupacion as string | null,
        notasInternas: data.notasInternas as string | null,
      },
    })
    revalidatePath("/admin/clientes")
    return { id: cliente.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear cliente"
    if (msg.includes("Unique constraint") && msg.includes("dni")) {
      return { error: "Ya existe un cliente con ese DNI" }
    }
    return { error: msg }
  }
}

export default function NuevoClientePage() {
  return <ClienteForm saveAction={createCliente} />
}

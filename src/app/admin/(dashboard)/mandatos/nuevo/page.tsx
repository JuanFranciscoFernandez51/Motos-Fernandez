import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { MandatoForm } from "@/components/admin/operativo/mandato-form"

export const dynamic = "force-dynamic"

async function createMandato(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const float = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseFloat(v) : null
    }
    const bool = (k: string) => get(k) === "true"
    const date = (k: string) => {
      const v = get(k)
      return v && v.trim() ? new Date(v) : null
    }

    const clienteId = get("clienteId")
    if (!clienteId) return { error: "Falta el cliente" }

    const fotosRaw = get("fotos")
    const fotos: string[] = fotosRaw ? JSON.parse(fotosRaw) : []

    const mandato = await prisma.mandatoVenta.create({
      data: {
        fotos,
        clienteId,
        marca: get("marca"),
        modelo: get("modelo"),
        anio: num("anio"),
        kilometros: num("kilometros"),
        cilindrada: get("cilindrada") || null,
        color: get("color") || null,
        chasis: get("chasis") || null,
        motor: get("motor") || null,
        patente: get("patente") || null,
        tieneTitulo: bool("tieneTitulo"),
        tituloANombreCliente: bool("tituloANombreCliente"),
        tienePrenda: bool("tienePrenda"),
        detallePrenda: get("detallePrenda") || null,
        verificacionTecnica: bool("verificacionTecnica"),
        precioVenta: num("precioVenta") ?? 0,
        precioMinimo: num("precioMinimo"),
        comisionPorc: float("comisionPorc"),
        comisionMonto: num("comisionMonto"),
        moneda: get("moneda") || "ARS",
        fechaFirma: date("fechaFirma"),
        fechaVencimiento: date("fechaVencimiento"),
        estado: (get("estado") || "PENDIENTE") as
          | "PENDIENTE"
          | "ACTIVO"
          | "VENDIDO"
          | "CANCELADO"
          | "VENCIDO",
        observaciones: get("observaciones") || null,
      },
    })

    revalidatePath("/admin/mandatos")
    return { id: mandato.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al crear mandato"
    return { error: msg }
  }
}

export default async function NuevoMandatoPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      telefono: true,
      email: true,
    },
  })
  return <MandatoForm clientes={clientes} saveAction={createMandato} />
}

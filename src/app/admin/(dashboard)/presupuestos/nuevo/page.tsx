import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PresupuestoForm } from "@/components/admin/operativo/presupuesto-form"

export const dynamic = "force-dynamic"

async function createPresupuesto(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const items = JSON.parse(get("items") || "[]") as Array<{
      descripcion: string
      tipo: string
      cantidad: string | number
      precio: string | number
    }>

    const subtotal = parseInt(get("subtotal")) || 0
    const total = parseInt(get("total")) || 0
    const descuento = parseInt(get("descuento")) || 0

    const pre = await prisma.presupuesto.create({
      data: {
        clienteId: get("clienteId") || null,
        clienteNombre: get("clienteNombre") || null,
        clienteContacto: get("clienteContacto") || null,
        motoMarca: get("motoMarca") || null,
        motoModelo: get("motoModelo") || null,
        motoAnio: num("motoAnio"),
        motoPatente: get("motoPatente") || null,
        motoKilometros: num("motoKilometros"),
        motivoIngreso: get("motivoIngreso") || null,
        trabajosACotizar: get("trabajosACotizar") || null,
        observaciones: get("observaciones") || null,
        validezDias: parseInt(get("validezDias")) || 15,
        estado: (get("estado") || "BORRADOR") as "BORRADOR" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "VENCIDO",
        items,
        subtotal,
        descuento,
        total,
      },
    })
    revalidatePath("/admin/presupuestos")
    return { id: pre.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al crear presupuesto" }
  }
}

export default async function NuevoPresupuestoPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    take: 15, // semilla: ClienteSelector busca server-side al tipear
    select: { id: true, nombre: true, apellido: true, dni: true, telefono: true, email: true },
  })
  return <PresupuestoForm clientes={clientes} saveAction={createPresupuesto} />
}

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { OrdenTrabajoForm } from "@/components/admin/operativo/orden-trabajo-form"

export const dynamic = "force-dynamic"

async function createOT(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const date = (k: string) => {
      const v = get(k)
      return v && v.trim() ? new Date(v) : null
    }

    const items = JSON.parse((get("items") as string) || "[]")

    const ot = await prisma.ordenTrabajo.create({
      data: {
        clienteId: get("clienteId"),
        modeloId: get("modeloId") || null,
        motoMarca: get("motoMarca"),
        motoModelo: get("motoModelo"),
        motoAnio: num("motoAnio"),
        motoPatente: get("motoPatente") || null,
        motoKilometros: num("motoKilometros"),
        tipoServicioId: get("tipoServicioId") || null,
        motivoIngreso: get("motivoIngreso"),
        diagnostico: get("diagnostico") || null,
        trabajosRealizados: get("trabajosRealizados") || null,
        items: items.length ? items : undefined,
        subtotal: num("subtotal") ?? 0,
        descuento: num("descuento") ?? 0,
        total: num("total") ?? 0,
        pagado: num("pagado") ?? 0,
        saldo: num("saldo") ?? 0,
        fechaPrometida: date("fechaPrometida"),
        estado: (get("estado") || "INGRESADA") as
          | "INGRESADA" | "EN_DIAGNOSTICO" | "PRESUPUESTADA" | "APROBADA"
          | "EN_REPARACION" | "LISTA" | "ENTREGADA" | "CANCELADA",
        observaciones: get("observaciones") || null,
      },
    })

    revalidatePath("/admin/taller")
    return { id: ot.id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al crear OT" }
  }
}

export default async function NuevaOTPage() {
  const [clientes, modelos, tiposServicio] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: {
        id: true, nombre: true, apellido: true, dni: true, telefono: true, email: true,
      },
    }),
    prisma.modelo.findMany({
      orderBy: [{ slug: "asc" }],
      select: {
        id: true, slug: true, nombre: true, marca: true, anio: true, kilometros: true,
        condicion: true, chasis: true, motor: true, patente: true, precio: true,
        moneda: true, fotos: true, vendida: true,
      },
    }),
    prisma.tipoServicio.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, precioBase: true },
    }),
  ])
  return <OrdenTrabajoForm clientes={clientes} modelos={modelos} tiposServicio={tiposServicio} saveAction={createOT} />
}

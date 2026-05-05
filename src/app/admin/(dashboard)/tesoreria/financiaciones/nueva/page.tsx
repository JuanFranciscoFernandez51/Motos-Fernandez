import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { FinanciacionManualForm } from "./financiacion-manual-form"
import { calcularVencimientoCuota } from "@/lib/financiacion-helpers"

export const dynamic = "force-dynamic"

async function crearFinanciacionManual(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }

    const clienteId = get("clienteId")
    const cantidadCuotas = num("cantidadCuotas") ?? 0
    const valorCuota = num("valorCuota") ?? 0
    const entrega = num("entrega") ?? 0
    const diaVencimiento = num("diaVencimiento") ?? 10
    const moneda = get("moneda") || "ARS"
    const descripcion = get("descripcion")
    const observaciones = get("observaciones") || null
    const fechaInicioStr = get("fechaInicio")
    const fechaInicio = fechaInicioStr ? new Date(fechaInicioStr) : new Date()

    if (!clienteId) return { error: "Seleccioná un cliente" }
    if (cantidadCuotas <= 0) return { error: "Cantidad de cuotas inválida" }
    if (valorCuota <= 0) return { error: "Valor de cuota inválido" }

    const montoTotal = valorCuota * cantidadCuotas
    const fechaFin = calcularVencimientoCuota(fechaInicio, cantidadCuotas, diaVencimiento)

    const financiacion = await prisma.$transaction(async (tx) => {
      const fin = await tx.financiacionOC.create({
        data: {
          clienteId,
          descripcion,
          origen: "MANUAL",
          montoTotal,
          entrega,
          cantidadCuotas,
          valorCuota,
          moneda,
          fechaInicio,
          fechaFin,
          diaVencimiento,
          estado: "ACTIVA",
          observaciones,
        },
      })

      const cuotasData = Array.from({ length: cantidadCuotas }, (_, i) => ({
        financiacionId: fin.id,
        numero: i + 1,
        monto: valorCuota,
        fechaVencimiento: calcularVencimientoCuota(fechaInicio, i + 1, diaVencimiento),
        estado: "PENDIENTE" as const,
      }))
      await tx.cuotaFinanciacion.createMany({ data: cuotasData })

      return fin
    })

    revalidatePath("/admin/tesoreria")
    revalidatePath("/admin/tesoreria/financiaciones")
    redirect(`/admin/tesoreria/financiaciones/${financiacion.id}`)
  } catch (e: unknown) {
    // redirect throws — re-lanzar
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e
    return {
      error: e instanceof Error ? e.message : "Error al crear financiación",
    }
  }
}

export default async function NuevaFinanciacionPage() {
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

  return <FinanciacionManualForm clientes={clientes} saveAction={crearFinanciacionManual} />
}

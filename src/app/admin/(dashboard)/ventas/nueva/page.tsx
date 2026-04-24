import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { VentaForm } from "@/components/admin/operativo/venta-form"

export const dynamic = "force-dynamic"

async function createVenta(formData: FormData) {
  "use server"
  try {
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const date = (k: string) => {
      const v = get(k)
      return v && v.trim() ? new Date(v) : new Date()
    }

    const venta = await prisma.ventaMoto.create({
      data: {
        clienteId: get("clienteId"),
        modeloId: get("modeloId") || null,
        motoDescripcion: get("motoDescripcion"),
        motoChasis: get("motoChasis") || null,
        motoMotor: get("motoMotor") || null,
        motoPatente: get("motoPatente") || null,
        motoAnio: num("motoAnio"),
        motoKilometros: num("motoKilometros"),
        precioVenta: num("precioVenta") ?? 0,
        moneda: get("moneda") || "ARS",
        formaPago: get("formaPago") || null,
        sena: num("sena"),
        saldo: num("saldo"),
        detallePago: get("detallePago") || null,
        permutaDescripcion: get("permutaDescripcion") || null,
        permutaValor: num("permutaValor"),
        cuotas: num("cuotas"),
        valorCuota: num("valorCuota"),
        entrega: num("entrega"),
        fecha: date("fecha"),
        estado: (get("estado") || "BORRADOR") as
          | "BORRADOR"
          | "RESERVADA"
          | "CONCRETADA"
          | "CANCELADA",
        observaciones: get("observaciones") || null,
      },
    })

    // Side effects según estado
    if (venta.modeloId) {
      if (venta.estado === "CONCRETADA") {
        // Moto entregada → marcar vendida y sacar del catálogo público
        await prisma.modelo.update({
          where: { id: venta.modeloId },
          data: { vendida: true, fechaVenta: venta.fecha, activo: false },
        })
      } else if (venta.estado === "RESERVADA") {
        // Moto con seña → marcar etiqueta RESERVADA (sigue visible en catálogo)
        await prisma.modelo.update({
          where: { id: venta.modeloId },
          data: { etiqueta: "RESERVADA" },
        })
      }
    }

    revalidatePath("/admin/ventas")
    revalidatePath("/admin/modelos")
    revalidatePath("/catalogo")
    return { id: venta.id }
  } catch (e: unknown) {
    return {
      error: e instanceof Error ? e.message : "Error al crear venta",
    }
  }
}

export default async function NuevaVentaPage() {
  const [clientes, modelos] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        telefono: true,
        email: true,
      },
    }),
    prisma.modelo.findMany({
      orderBy: [{ slug: "asc" }],
      select: {
        id: true,
        slug: true,
        nombre: true,
        marca: true,
        anio: true,
        kilometros: true,
        condicion: true,
        chasis: true,
        motor: true,
        patente: true,
        precio: true,
        moneda: true,
        fotos: true,
        vendida: true,
      },
    }),
  ])
  return <VentaForm clientes={clientes} modelos={modelos} saveAction={createVenta} />
}

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { VentaForm } from "@/components/admin/operativo/venta-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatNumero,
  ESTADO_VENTA_STYLES,
  ESTADO_VENTA_LABELS,
} from "@/lib/admin-helpers"
import { FileText, CheckCircle, Trash2, Download, PartyPopper } from "lucide-react"
import { invalidateModelos } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"

async function updateVenta(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const date = (k: string) => {
      const v = get(k)
      return v && v.trim() ? new Date(v) : new Date()
    }

    const venta = await prisma.ventaMoto.update({
      where: { id },
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

    // Side effects según estado actualizado
    if (venta.modeloId) {
      if (venta.estado === "CONCRETADA") {
        await prisma.modelo.update({
          where: { id: venta.modeloId },
          data: { vendida: true, fechaVenta: venta.fecha, activo: false },
        })
      } else if (venta.estado === "RESERVADA") {
        await prisma.modelo.update({
          where: { id: venta.modeloId },
          data: { etiqueta: "RESERVADA" },
        })
      }
    }

    revalidatePath("/admin/ventas")
    revalidatePath("/admin/modelos")
    revalidatePath("/catalogo")
    if (venta.modeloId) invalidateModelos()
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al actualizar" }
  }
}

async function marcarConcretada(id: string) {
  "use server"
  const venta = await prisma.ventaMoto.findUnique({ where: { id } })
  if (!venta) return

  await prisma.ventaMoto.update({
    where: { id },
    data: { estado: "CONCRETADA" },
  })

  // Si hay moto del catálogo, marcarla como vendida
  if (venta.modeloId) {
    await prisma.modelo.update({
      where: { id: venta.modeloId },
      data: { vendida: true, fechaVenta: new Date(), activo: false },
    })
  }

  revalidatePath("/admin/ventas")
  revalidatePath(`/admin/ventas/${id}`)
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  if (venta.modeloId) invalidateModelos()
}

async function deleteVenta(id: string) {
  "use server"
  await prisma.ventaMoto.delete({ where: { id } })
  revalidatePath("/admin/ventas")
  redirect("/admin/ventas")
}

export default async function EditarVentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ recien?: string }>
}) {
  const { id } = await params
  const { recien } = await searchParams
  const esReciente = recien === "1"

  const [venta, clientes, modelos] = await Promise.all([
    prisma.ventaMoto.findUnique({ where: { id } }),
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

  if (!venta) notFound()

  const toDateInput = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "")

  const initialData = {
    id: venta.id,
    clienteId: venta.clienteId,
    modeloId: venta.modeloId || "",
    motoDescripcion: venta.motoDescripcion,
    motoChasis: venta.motoChasis || "",
    motoMotor: venta.motoMotor || "",
    motoPatente: venta.motoPatente || "",
    motoAnio: venta.motoAnio != null ? String(venta.motoAnio) : "",
    motoKilometros: venta.motoKilometros != null ? String(venta.motoKilometros) : "",
    precioVenta: String(venta.precioVenta),
    moneda: venta.moneda,
    formaPago: venta.formaPago || "Contado",
    sena: venta.sena != null ? String(venta.sena) : "",
    saldo: venta.saldo != null ? String(venta.saldo) : "",
    detallePago: venta.detallePago || "",
    permutaDescripcion: venta.permutaDescripcion || "",
    permutaValor: venta.permutaValor != null ? String(venta.permutaValor) : "",
    cuotas: venta.cuotas != null ? String(venta.cuotas) : "",
    valorCuota: venta.valorCuota != null ? String(venta.valorCuota) : "",
    entrega: venta.entrega != null ? String(venta.entrega) : "",
    fecha: toDateInput(venta.fecha),
    estado: venta.estado,
    observaciones: venta.observaciones || "",
  }

  return (
    <div className="space-y-6">
      {esReciente && (
        <div className="rounded-xl border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <PartyPopper className="size-5" />
            </div>
            <div>
              <p className="font-bold text-green-900">
                ¡Venta registrada con éxito!
              </p>
              <p className="text-sm text-green-800 dark:text-green-300/80 mt-0.5">
                Descargá el boleto de compra-venta para firmarlo con el cliente.
              </p>
            </div>
          </div>
          <a
            href={`/api/pdf/venta/${venta.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 shadow-md"
          >
            <Download className="size-4" />
            Descargar boleto (PDF)
          </a>
        </div>
      )}

      <Card className="border-[#6B4F7A]/30">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Venta</p>
              <p className="font-mono text-lg font-bold text-[#6B4F7A]">
                {formatNumero("V", venta.numero)}
              </p>
            </div>
            <Badge variant="secondary" className={ESTADO_VENTA_STYLES[venta.estado]}>
              {ESTADO_VENTA_LABELS[venta.estado]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/pdf/venta/${venta.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
            >
              <FileText className="size-4" /> Boleto compra-venta
            </a>
            {venta.estado !== "CONCRETADA" && venta.estado !== "CANCELADA" && (
              <form action={marcarConcretada.bind(null, venta.id)}>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="size-4 mr-1" />
                  Marcar como concretada
                </Button>
              </form>
            )}
            <form action={deleteVenta.bind(null, venta.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 dark:bg-red-950/30"
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <VentaForm
        initialData={initialData}
        clientes={clientes}
        modelos={modelos}
        saveAction={updateVenta}
      />
    </div>
  )
}

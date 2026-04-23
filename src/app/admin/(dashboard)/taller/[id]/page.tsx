import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { OrdenTrabajoForm, type OTItem } from "@/components/admin/operativo/orden-trabajo-form"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  formatNumero,
  ESTADO_OT_STYLES,
  ESTADO_OT_LABELS,
} from "@/lib/admin-helpers"
import { FileText, Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

async function updateOT(formData: FormData) {
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
      return v && v.trim() ? new Date(v) : null
    }
    const items = JSON.parse((get("items") as string) || "[]")

    await prisma.ordenTrabajo.update({
      where: { id },
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
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al actualizar" }
  }
}

async function deleteOT(id: string) {
  "use server"
  await prisma.ordenTrabajo.delete({ where: { id } })
  revalidatePath("/admin/taller")
  redirect("/admin/taller")
}

export default async function EditarOTPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [ot, clientes, modelos, tiposServicio] = await Promise.all([
    prisma.ordenTrabajo.findUnique({ where: { id } }),
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

  if (!ot) notFound()

  const toDateInput = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "")

  const rawItems = (ot.items as OTItem[] | null) ?? []
  const items: OTItem[] = rawItems.map((it) => ({
    descripcion: String(it.descripcion || ""),
    tipo: (it.tipo === "mano_obra" ? "mano_obra" : "repuesto") as "repuesto" | "mano_obra",
    cantidad: String(it.cantidad || "1"),
    precio: String(it.precio || ""),
  }))

  const initialData = {
    id: ot.id,
    clienteId: ot.clienteId,
    modeloId: ot.modeloId || "",
    motoMarca: ot.motoMarca,
    motoModelo: ot.motoModelo,
    motoAnio: ot.motoAnio != null ? String(ot.motoAnio) : "",
    motoPatente: ot.motoPatente || "",
    motoKilometros: ot.motoKilometros != null ? String(ot.motoKilometros) : "",
    tipoServicioId: ot.tipoServicioId || "",
    motivoIngreso: ot.motivoIngreso,
    diagnostico: ot.diagnostico || "",
    trabajosRealizados: ot.trabajosRealizados || "",
    items,
    descuento: ot.descuento ? String(ot.descuento) : "",
    pagado: ot.pagado ? String(ot.pagado) : "",
    fechaPrometida: toDateInput(ot.fechaPrometida),
    estado: ot.estado,
    observaciones: ot.observaciones || "",
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#6B4F7A]/30">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Orden de trabajo</p>
              <p className="font-mono text-lg font-bold text-[#6B4F7A]">
                {formatNumero("OT", ot.numero)}
              </p>
            </div>
            <Badge variant="secondary" className={ESTADO_OT_STYLES[ot.estado]}>
              {ESTADO_OT_LABELS[ot.estado]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/pdf/orden-trabajo/${ot.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <FileText className="size-4" /> PDF
            </a>
            <form action={deleteOT.bind(null, ot.id)}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <OrdenTrabajoForm
        initialData={initialData}
        clientes={clientes}
        modelos={modelos}
        tiposServicio={tiposServicio}
        saveAction={updateOT}
      />
    </div>
  )
}

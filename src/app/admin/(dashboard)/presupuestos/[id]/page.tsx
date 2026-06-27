import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { PresupuestoForm } from "@/components/admin/operativo/presupuesto-form"
import { Button } from "@/components/ui/button"
import { Download, Printer, Trash2, FileCheck } from "lucide-react"

export const dynamic = "force-dynamic"

async function updatePresupuesto(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
    const get = (k: string) => (formData.get(k) as string) || ""
    const num = (k: string) => {
      const v = get(k)
      return v && v.trim() ? parseInt(v) : null
    }
    const items = JSON.parse(get("items") || "[]")

    await prisma.presupuesto.update({
      where: { id },
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
        subtotal: parseInt(get("subtotal")) || 0,
        descuento: parseInt(get("descuento")) || 0,
        total: parseInt(get("total")) || 0,
      },
    })
    revalidatePath("/admin/presupuestos")
    revalidatePath(`/admin/presupuestos/${id}`)
    return { id }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error al actualizar" }
  }
}

async function deletePresupuesto(id: string) {
  "use server"
  await prisma.presupuesto.delete({ where: { id } })
  revalidatePath("/admin/presupuestos")
  redirect("/admin/presupuestos")
}

async function convertirAOT(id: string) {
  "use server"
  const pre = await prisma.presupuesto.findUnique({ where: { id } })
  if (!pre || !pre.clienteId) {
    throw new Error("El presupuesto necesita un cliente vinculado para convertirse en OT")
  }
  if (pre.ordenTrabajoId) {
    redirect(`/admin/taller/${pre.ordenTrabajoId}`)
  }
  const ot = await prisma.ordenTrabajo.create({
    data: {
      clienteId: pre.clienteId,
      motoMarca: pre.motoMarca || "—",
      motoModelo: pre.motoModelo || "—",
      motoAnio: pre.motoAnio,
      motoPatente: pre.motoPatente,
      motoKilometros: pre.motoKilometros,
      motivoIngreso: pre.motivoIngreso || "Pedido del cliente",
      items: pre.items as never,
      subtotal: pre.subtotal,
      descuento: pre.descuento,
      total: pre.total,
      saldo: pre.total,
      observaciones: `Convertido del presupuesto PRE-${String(pre.numero).padStart(4, "0")}.\n\n${pre.observaciones || ""}`,
      estado: "APROBADA",
    },
  })
  await prisma.presupuesto.update({
    where: { id },
    data: { estado: "ACEPTADO", ordenTrabajoId: ot.id },
  })
  revalidatePath("/admin/presupuestos")
  revalidatePath("/admin/taller")
  redirect(`/admin/taller/${ot.id}`)
}

export default async function PresupuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [pre, clientes] = await Promise.all([
    prisma.presupuesto.findUnique({ where: { id } }),
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      take: 15, // semilla: ClienteSelector busca server-side al tipear
      select: { id: true, nombre: true, apellido: true, dni: true, telefono: true, email: true },
    }),
  ])

  if (!pre) notFound()

  const initialItems = (pre.items as Array<{ descripcion: string; tipo: string; cantidad: number | string; precio: number | string }> | null) ?? []

  const initialData = {
    id: pre.id,
    clienteId: pre.clienteId || "",
    clienteNombre: pre.clienteNombre || "",
    clienteContacto: pre.clienteContacto || "",
    motoMarca: pre.motoMarca || "",
    motoModelo: pre.motoModelo || "",
    motoAnio: pre.motoAnio != null ? String(pre.motoAnio) : "",
    motoPatente: pre.motoPatente || "",
    motoKilometros: pre.motoKilometros != null ? String(pre.motoKilometros) : "",
    motivoIngreso: pre.motivoIngreso || "",
    trabajosACotizar: pre.trabajosACotizar || "",
    observaciones: pre.observaciones || "",
    validezDias: String(pre.validezDias),
    estado: pre.estado,
    descuento: String(pre.descuento),
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#7C3AED]/30 bg-gradient-to-r from-[#7C3AED]/5 to-transparent p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Presupuesto</p>
          <p className="font-mono text-lg font-bold text-[#7C3AED]">PRE-{String(pre.numero).padStart(4, "0")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/pdf/presupuesto/${pre.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#7C3AED] hover:bg-[#9D5CF0] text-white px-3 py-1.5 text-sm font-medium"
          >
            <Download className="size-4" /> Descargar PDF
          </a>
          <a
            href={`/api/pdf/presupuesto/${pre.id}?inline=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
          >
            <Printer className="size-4" /> Imprimir
          </a>
          {!pre.ordenTrabajoId && (
            <form action={convertirAOT.bind(null, pre.id)}>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileCheck className="size-4 mr-1.5" /> Convertir a OT
              </Button>
            </form>
          )}
          {pre.ordenTrabajoId && (
            <Button
              variant="outline"
              render={<Link href={`/admin/taller/${pre.ordenTrabajoId}`} />}
              className="border-emerald-300 text-emerald-700"
            >
              Ver OT generada
            </Button>
          )}
          <form action={deletePresupuesto.bind(null, pre.id)}>
            <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
              <Trash2 className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      <PresupuestoForm
        initialData={initialData}
        initialItems={initialItems.map((it) => ({
          descripcion: String(it.descripcion || ""),
          tipo: (it.tipo === "mano_obra" ? "mano_obra" : "repuesto") as "repuesto" | "mano_obra",
          cantidad: String(it.cantidad ?? 1),
          precio: String(it.precio ?? 0),
        }))}
        clientes={clientes}
        saveAction={updatePresupuesto}
      />
    </div>
  )
}

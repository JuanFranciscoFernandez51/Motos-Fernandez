import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { MandatoForm } from "@/components/admin/operativo/mandato-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatDate,
  formatMoney,
  formatNumero,
  ESTADO_MANDATO_STYLES,
  ESTADO_MANDATO_LABELS,
} from "@/lib/admin-helpers"
import { FileText, Rocket, ExternalLink, Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

async function updateMandato(formData: FormData) {
  "use server"
  try {
    const id = formData.get("id") as string
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

    const fotosRaw = get("fotos")
    const fotos: string[] = fotosRaw ? JSON.parse(fotosRaw) : []

    await prisma.mandatoVenta.update({
      where: { id },
      data: {
        fotos,
        clienteId: get("clienteId"),
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
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al actualizar mandato"
    return { error: msg }
  }
}

async function publicarEnCatalogo(id: string) {
  "use server"
  const mandato = await prisma.mandatoVenta.findUnique({
    where: { id },
    include: { cliente: true },
  })
  if (!mandato) return
  if (mandato.modeloId) return // ya está publicado

  // Generar slug único desde marca+modelo+numero
  const baseSlug = `${mandato.marca}-${mandato.modelo}-mv${mandato.numero}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const modelo = await prisma.modelo.create({
    data: {
      nombre: `${mandato.marca} ${mandato.modelo}`,
      slug: baseSlug,
      marca: mandato.marca,
      categoriaVehiculo: "MOTOCICLETA",
      condicion: "USADA",
      anio: mandato.anio,
      kilometros: mandato.kilometros,
      cilindrada: mandato.cilindrada,
      precio: mandato.precioVenta,
      moneda: mandato.moneda,
      activo: false, // inactivo hasta que le carguen fotos
      chasis: mandato.chasis,
      motor: mandato.motor,
      patente: mandato.patente,
      clienteNombre: `${mandato.cliente.apellido}, ${mandato.cliente.nombre}`,
      clienteContacto: mandato.cliente.telefono || mandato.cliente.email,
      notasInternas: mandato.observaciones,
      // Si el mandato tiene fotos, las usa; sino, placeholder
      fotos: mandato.fotos.length > 0 ? mandato.fotos : ["/images/logo-clasico.png"],
    },
  })

  await prisma.mandatoVenta.update({
    where: { id },
    data: { modeloId: modelo.id, estado: "ACTIVO" },
  })

  revalidatePath("/admin/mandatos")
  revalidatePath(`/admin/mandatos/${id}`)
  revalidatePath("/admin/modelos")
  redirect(`/admin/modelos/${modelo.id}`)
}

async function deleteMandato(id: string) {
  "use server"
  await prisma.mandatoVenta.delete({ where: { id } })
  revalidatePath("/admin/mandatos")
  redirect("/admin/mandatos")
}

export default async function EditarMandatoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [mandato, clientes] = await Promise.all([
    prisma.mandatoVenta.findUnique({
      where: { id },
      include: {
        cliente: true,
        modelo_: { select: { id: true, slug: true, activo: true } },
      },
    }),
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
  ])

  if (!mandato) notFound()

  const toDateInput = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "")

  const initialData = {
    id: mandato.id,
    clienteId: mandato.clienteId,
    marca: mandato.marca,
    modelo: mandato.modelo,
    anio: mandato.anio != null ? String(mandato.anio) : "",
    kilometros: mandato.kilometros != null ? String(mandato.kilometros) : "",
    cilindrada: mandato.cilindrada || "",
    color: mandato.color || "",
    chasis: mandato.chasis || "",
    motor: mandato.motor || "",
    patente: mandato.patente || "",
    tieneTitulo: mandato.tieneTitulo,
    tituloANombreCliente: mandato.tituloANombreCliente,
    tienePrenda: mandato.tienePrenda,
    detallePrenda: mandato.detallePrenda || "",
    verificacionTecnica: mandato.verificacionTecnica,
    precioVenta: String(mandato.precioVenta),
    precioMinimo: mandato.precioMinimo != null ? String(mandato.precioMinimo) : "",
    comisionPorc: mandato.comisionPorc != null ? String(mandato.comisionPorc) : "",
    comisionMonto: mandato.comisionMonto != null ? String(mandato.comisionMonto) : "",
    moneda: mandato.moneda,
    fechaFirma: toDateInput(mandato.fechaFirma),
    fechaVencimiento: toDateInput(mandato.fechaVencimiento),
    estado: mandato.estado,
    observaciones: mandato.observaciones || "",
    fotos: mandato.fotos,
  }

  return (
    <div className="space-y-6">
      {/* Banner con numero + acciones */}
      <Card className="border-[#6B4F7A]/30">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Mandato</p>
              <p className="font-mono text-lg font-bold text-[#6B4F7A]">
                {formatNumero("MV", mandato.numero)}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={ESTADO_MANDATO_STYLES[mandato.estado]}
            >
              {ESTADO_MANDATO_LABELS[mandato.estado]}
            </Badge>
            {mandato.modelo_ && (
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                Publicado en catálogo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/pdf/mandato/${mandato.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
            >
              <FileText className="size-4" /> Generar PDF
            </a>
            {mandato.modelo_ ? (
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/admin/modelos/${mandato.modelo_.id}`} />
                }
              >
                <ExternalLink className="size-4 mr-1" />
                Ver en catálogo
              </Button>
            ) : (
              <form action={publicarEnCatalogo.bind(null, mandato.id)}>
                <Button type="submit" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
                  <Rocket className="size-4 mr-1" />
                  Publicar en catálogo
                </Button>
              </form>
            )}
            <form action={deleteMandato.bind(null, mandato.id)}>
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

      <MandatoForm
        initialData={initialData}
        clientes={clientes}
        saveAction={updateMandato}
      />
    </div>
  )
}

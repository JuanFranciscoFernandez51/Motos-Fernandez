import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { nombreCompleto } from "@/lib/admin-helpers"
import { MandatosListFilters } from "./mandatos-filters"
import { invalidateModelos } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"

async function updateFotosMandato(id: string, fotos: string[]) {
  "use server"
  await prisma.mandatoVenta.update({
    where: { id },
    data: { fotos },
  })
  revalidatePath("/admin/mandatos")
  revalidatePath(`/admin/mandatos/${id}`)
}

async function publicarDesdeLista(id: string) {
  "use server"
  const mandato = await prisma.mandatoVenta.findUnique({
    where: { id },
    include: { cliente: true },
  })
  if (!mandato || mandato.modeloId) return

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
      activo: false,
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
  revalidatePath("/admin/modelos")
  revalidatePath("/catalogo")
  invalidateModelos()
  redirect(`/admin/modelos/${modelo.id}`)
}

export default async function MandatosPage() {
  const mandatos = await prisma.mandatoVenta.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      cliente: { select: { nombre: true, apellido: true, dni: true } },
      modelo_: { select: { slug: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mandatos de venta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consignaciones de motos que el cliente dejó para vender.
          </p>
        </div>
        <Button
          render={<Link href="/admin/mandatos/nuevo" />}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo mandato
        </Button>
      </div>

      <MandatosListFilters
        mandatos={mandatos.map((m) => ({
          id: m.id,
          numero: m.numero,
          estado: m.estado,
          marca: m.marca,
          modelo: m.modelo,
          anio: m.anio,
          precioVenta: m.precioVenta,
          moneda: m.moneda,
          fechaFirma: m.fechaFirma,
          createdAt: m.createdAt,
          clienteNombre: nombreCompleto(m.cliente),
          clienteDni: m.cliente.dni,
          publicado: !!m.modelo_,
          fotos: m.fotos,
        }))}
        updateFotosMandato={updateFotosMandato}
        publicarDesdeLista={publicarDesdeLista}
      />
    </div>
  )
}

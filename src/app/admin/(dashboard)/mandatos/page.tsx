import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { nombreCompleto } from "@/lib/admin-helpers"
import { MandatosListFilters } from "./mandatos-filters"
import { invalidateModelos } from "@/lib/cached-queries"
import { generarCodigoModelo } from "@/lib/codigo-modelo-helpers"
import { mapMandatoToModeloData } from "@/lib/mandato-helpers"

export const dynamic = "force-dynamic"

async function updateFotosMandato(id: string, fotos: string[]) {
  "use server"
  // Guardamos las fotos en el mandato Y, si ya está publicado en el
  // catálogo, también en el modelo asociado — sino las fotos quedaban
  // huérfanas en el mandato y el modelo se quedaba con el placeholder.
  const mandato = await prisma.mandatoVenta.update({
    where: { id },
    data: { fotos },
    select: { modeloId: true },
  })
  if (mandato.modeloId && fotos.length > 0) {
    await prisma.modelo.update({
      where: { id: mandato.modeloId },
      data: { fotos },
    })
    revalidatePath("/admin/modelos")
    revalidatePath("/catalogo")
    invalidateModelos()
  }
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

  const modelo = await prisma.$transaction(async (tx) => {
    const codigo = await generarCodigoModelo(tx, { condicion: "USADA" })
    return tx.modelo.create({
      data: {
        nombre: `${mandato.marca} ${mandato.modelo}`,
        slug: baseSlug,
        codigo,
        marca: mandato.marca,
        categoriaVehiculo: "MOTOCICLETA",
        condicion: "USADA",
        activo: false,
        // Trazabilidad: la moto vino por consignacion (MANDATO) y el dueño
        // que la trajo es el cliente del mandato.
        origen: "MANDATO",
        clienteEntregaId: mandato.clienteId,
        clienteNombre: `${mandato.cliente.apellido}, ${mandato.cliente.nombre}`,
        clienteContacto: mandato.cliente.telefono || mandato.cliente.email,
        // Resto de los campos viaja por el helper compartido (color,
        // fotos, año, km, chasis, motor, patente, precio, etc.). Si no
        // hay fotos cargadas en el mandato, usamos placeholder.
        ...mapMandatoToModeloData(mandato, { incluirFotos: true }),
        fotos: mandato.fotos.length > 0 ? mandato.fotos : ["/images/logo-clasico.png"],
      },
    })
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
          className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
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
          tipoTenencia: m.tipoTenencia,
        }))}
        updateFotosMandato={updateFotosMandato}
        publicarDesdeLista={publicarDesdeLista}
      />
    </div>
  )
}

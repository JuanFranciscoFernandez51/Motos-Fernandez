import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSection } from "@/lib/admin-auth"
import { StockMotosClient, type StockMotoUI } from "./stock-motos-client"

export const dynamic = "force-dynamic"

export default async function StockMotosPage() {
  const session = await requireSection("STOCK_MOTOS")
  if (!session) redirect("/admin")

  // Cargamos clientes para el ClienteSelector del modal de edicion rapida.
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

  const motos = await prisma.modelo.findMany({
    // Stock = todo lo que podemos ofertar para vender, propio o consignado.
    // Las EN_DOMICILIO (mandato externo) se traen también para tener los
    // datos a mano al armar OC. Se separan visualmente en el cliente con
    // tabs y badge SOLO WEB; el default del filtro es "EN_LOCAL" para que
    // sigan apareciendo primero las físicas.
    orderBy: [{ codigo: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      codigo: true,
      slug: true,
      marca: true,
      nombre: true,
      condicion: true,
      anio: true,
      kilometros: true,
      chasis: true,
      motor: true,
      patente: true,
      precio: true,
      moneda: true,
      activo: true,
      vendida: true,
      fechaVenta: true,
      archivada: true,
      fechaArchivada: true,
      motivoArchivada: true,
      etiqueta: true,
      origen: true,
      tipoTenencia: true,
      createdAt: true,
      fotos: true,
      proveedor: { select: { nombre: true } },
      clienteEntregaId: true,
      clienteEntrega: { select: { nombre: true, apellido: true, telefono: true } },
      ordenCompraVenta: { select: { id: true, numero: true } },
      // Mandato: la moto está en consignación y nos la trajo este cliente.
      // Si el origen=MANDATO el "dueño" sale del mandato.cliente. Para las
      // EN_DOMICILIO necesitamos también fechaFirma/vencimiento y la
      // dirección donde está la moto para ofertarla con la info a mano.
      mandato: {
        select: {
          id: true,
          numero: true,
          estado: true,
          fechaFirma: true,
          fechaVencimiento: true,
          direccionTenencia: true,
          cliente: { select: { nombre: true, apellido: true, telefono: true } },
        },
      },
    },
  })

  const ui: StockMotoUI[] = motos.map((m) => {
    // Unificamos el "cliente dueño" según el origen: para PARTE_DE_PAGO
    // viene en clienteEntrega; para MANDATO sale del mandato relacionado.
    const clienteDueno =
      m.clienteEntrega
        ? `${m.clienteEntrega.apellido}, ${m.clienteEntrega.nombre}`
        : m.mandato?.cliente
          ? `${m.mandato.cliente.apellido}, ${m.mandato.cliente.nombre}`
          : null

    return {
      id: m.id,
      codigo: m.codigo,
      slug: m.slug,
      marca: m.marca,
      nombre: m.nombre,
      condicion: m.condicion || "0KM",
      anio: m.anio,
      kilometros: m.kilometros,
      chasis: m.chasis,
      motor: m.motor,
      patente: m.patente,
      precio: m.precio,
      moneda: m.moneda,
      activo: m.activo,
      vendida: m.vendida,
      fechaVenta: m.fechaVenta ? m.fechaVenta.toISOString() : null,
      archivada: m.archivada,
      fechaArchivada: m.fechaArchivada ? m.fechaArchivada.toISOString() : null,
      motivoArchivada: m.motivoArchivada,
      etiqueta: m.etiqueta,
      origen: m.origen,
      proveedor: m.proveedor?.nombre || null,
      clienteEntrega: clienteDueno,
      clienteEntregaId: m.clienteEntregaId,
      clienteTelefono:
        m.clienteEntrega?.telefono || m.mandato?.cliente.telefono || null,
      ocVentaNumero: m.ordenCompraVenta?.numero ?? null,
      ocVentaId: m.ordenCompraVenta?.id ?? null,
      fotoPrincipal: m.fotos?.[0] || null,
      createdAt: m.createdAt.toISOString(),
      // Tenencia: EN_LOCAL (default) o EN_DOMICILIO. Si está en domicilio,
      // mostramos badge SOLO WEB y la dirección donde está la moto.
      tipoTenencia: m.tipoTenencia || "EN_LOCAL",
      direccionTenencia: m.mandato?.direccionTenencia || null,
      mandatoId: m.mandato?.id || null,
      mandatoNumero: m.mandato?.numero ?? null,
      mandatoEstado: m.mandato?.estado || null,
      mandatoFechaFirma: m.mandato?.fechaFirma
        ? m.mandato.fechaFirma.toISOString()
        : null,
      mandatoVencimiento: m.mandato?.fechaVencimiento
        ? m.mandato.fechaVencimiento.toISOString()
        : null,
    }
  })

  return <StockMotosClient motos={ui} clientes={clientes} />
}

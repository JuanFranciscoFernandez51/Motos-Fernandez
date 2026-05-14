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
      etiqueta: true,
      origen: true,
      createdAt: true,
      fotos: true,
      proveedor: { select: { nombre: true } },
      clienteEntregaId: true,
      clienteEntrega: { select: { nombre: true, apellido: true } },
      ordenCompraVenta: { select: { id: true, numero: true } },
      // Mandato: la moto está en consignación y nos la trajo este cliente.
      // Si el origen=MANDATO el "dueño" sale del mandato.cliente.
      mandato: {
        select: {
          cliente: { select: { nombre: true, apellido: true } },
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
      etiqueta: m.etiqueta,
      origen: m.origen,
      proveedor: m.proveedor?.nombre || null,
      clienteEntrega: clienteDueno,
      clienteEntregaId: m.clienteEntregaId,
      ocVentaNumero: m.ordenCompraVenta?.numero ?? null,
      ocVentaId: m.ordenCompraVenta?.id ?? null,
      fotoPrincipal: m.fotos?.[0] || null,
      createdAt: m.createdAt.toISOString(),
    }
  })

  return <StockMotosClient motos={ui} clientes={clientes} />
}

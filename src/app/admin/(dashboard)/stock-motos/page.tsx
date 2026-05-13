import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSection } from "@/lib/admin-auth"
import { StockMotosClient, type StockMotoUI } from "./stock-motos-client"

export const dynamic = "force-dynamic"

/**
 * Página /admin/stock-motos
 *
 * Vista administrativa de la flota: muestra los datos que importan para
 * la administracion (modelo, año, km, chasis, motor, patente, dueño /
 * mandato, precio de toma y precio de venta). Sin descripcion, fotos
 * ni SEO — eso se sigue editando desde el catalogo publico (/admin/modelos)
 * con el que comparte el mismo modelo Prisma `Modelo`, asi la sincronizacion
 * es automatica:
 *  - si se vende desde el catalogo → vendida=true → aparece en "Vendidas"
 *  - si se reserva (etiqueta=RESERVADA) → aparece en "Reservadas"
 *  - si entra una moto por permuta o mandato → aparece nueva aca con su
 *    referencia al dueño/permuta
 */
export default async function StockMotosPage() {
  const session = await requireSection("STOCK_MOTOS")
  if (!session) redirect("/admin")

  const motos = await prisma.modelo.findMany({
    orderBy: [{ vendida: "asc" }, { createdAt: "desc" }],
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
      // Cliente que entregó la moto (si vino por parte de pago)
      clienteEntrega: {
        select: { id: true, nombre: true, apellido: true },
      },
      // OC origen (si vino por permuta o mandato)
      ordenCompraOrigen: { select: { id: true, numero: true } },
      // OC de venta (si ya se vendió)
      ordenCompraVenta: {
        select: { id: true, numero: true, fecha: true, precioVenta: true, moneda: true },
      },
      // Mandato (si la moto está en consignación)
      mandato: {
        select: {
          id: true,
          numero: true,
          estado: true,
          precioVenta: true,
          precioMinimo: true,
          moneda: true,
          cliente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      // OCPermuta que la generó (si vino como parte de pago)
      ocPermuta: {
        select: {
          id: true,
          valor: true,
          moneda: true,
          ordenCompra: {
            select: {
              id: true,
              numero: true,
              cliente: { select: { id: true, nombre: true, apellido: true } },
            },
          },
        },
      },
    },
  })

  const ui: StockMotoUI[] = motos.map((m) => {
    // Dueño / referencia administrativa: depende del origen
    let dueno: StockMotoUI["dueno"] = null
    if (m.mandato?.cliente) {
      dueno = {
        tipo: "MANDATO",
        nombre: `${m.mandato.cliente.apellido}, ${m.mandato.cliente.nombre}`,
        clienteId: m.mandato.cliente.id,
        mandatoId: m.mandato.id,
        mandatoNumero: m.mandato.numero,
      }
    } else if (m.ocPermuta?.ordenCompra?.cliente) {
      dueno = {
        tipo: "PERMUTA",
        nombre: `${m.ocPermuta.ordenCompra.cliente.apellido}, ${m.ocPermuta.ordenCompra.cliente.nombre}`,
        clienteId: m.ocPermuta.ordenCompra.cliente.id,
        ocId: m.ocPermuta.ordenCompra.id,
        ocNumero: m.ocPermuta.ordenCompra.numero,
      }
    } else if (m.clienteEntrega) {
      dueno = {
        tipo: "PERMUTA",
        nombre: `${m.clienteEntrega.apellido}, ${m.clienteEntrega.nombre}`,
        clienteId: m.clienteEntrega.id,
      }
    }

    // Precio de toma (lo que pagamos por la moto):
    //  - PERMUTA: valor de la OCPermuta
    //  - MANDATO: precioMinimo del mandato (lo que le pagamos al consignante)
    //  - STOCK_PROPIO / UNIDAD_VENDIDA_0KM: no aplica (no lo trackeamos hoy)
    let precioCompra: { monto: number; moneda: string } | null = null
    if (m.ocPermuta) {
      precioCompra = { monto: m.ocPermuta.valor, moneda: m.ocPermuta.moneda }
    } else if (m.mandato) {
      precioCompra = {
        monto: m.mandato.precioMinimo ?? m.mandato.precioVenta,
        moneda: m.mandato.moneda,
      }
    }

    // Estado operativo del stock (no confundir con vendida en sí)
    let estado: StockMotoUI["estado"] = "EN_STOCK"
    if (m.vendida) estado = "VENDIDA"
    else if (m.etiqueta === "RESERVADA") estado = "RESERVADA"

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
      origen: m.origen || "STOCK_PROPIO",
      proveedor: m.proveedor?.nombre || null,
      fotoPrincipal: m.fotos?.[0] || null,
      dueno,
      precioCompra,
      ocVenta: m.ordenCompraVenta
        ? {
            id: m.ordenCompraVenta.id,
            numero: m.ordenCompraVenta.numero,
            precioVenta: m.ordenCompraVenta.precioVenta,
            moneda: m.ordenCompraVenta.moneda,
            fecha: m.ordenCompraVenta.fecha.toISOString(),
          }
        : null,
      estado,
      createdAt: m.createdAt.toISOString(),
    }
  })

  return <StockMotosClient motos={ui} />
}

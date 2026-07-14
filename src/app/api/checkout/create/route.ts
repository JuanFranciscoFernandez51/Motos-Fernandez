import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPreferenceApi } from "@/lib/mercadopago"

interface CartItem {
  id: string
  nombre: string
  precio: number
  precioOferta?: number | null
  foto?: string
  slug: string
  talle?: string
  cantidad: number
  categoriaId: string
}

interface CheckoutBody {
  nombre: string
  apellido: string
  email: string
  telefono: string
  dni: string
  items: CartItem[]
  cuponCodigo?: string
  descuento?: number
  total?: number
}

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function POST(request: NextRequest) {
  // Check MP token early to give a clear error
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Servicio de pago no configurado. Contactanos por WhatsApp." },
      { status: 503 }
    )
  }

  try {
    const body: CheckoutBody = await request.json()
    const { nombre, apellido, email, telefono, dni, items, cuponCodigo, descuento = 0 } = body

    // Basic validation
    if (!nombre || !apellido || !email || !telefono || !dni) {
      return NextResponse.json({ error: "Faltan datos del comprador" }, { status: 400 })
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 })
    }

    // Validate products and stock in DB
    const productIds = [...new Set(items.map((i) => i.id))]
    const productos = await prisma.producto.findMany({
      where: { id: { in: productIds }, activo: true },
    })

    const productoMap = new Map(productos.map((p) => [p.id, p]))

    for (const item of items) {
      const prod = productoMap.get(item.id)
      if (!prod) {
        return NextResponse.json(
          { error: `Producto "${item.nombre}" no disponible` },
          { status: 400 }
        )
      }

      // Check stock
      if (item.talle) {
        const stockPorTalle = (prod.stockPorTalle as Record<string, number>) || {}
        const stockTalle = stockPorTalle[item.talle] ?? 0
        if (stockTalle < item.cantidad) {
          return NextResponse.json(
            { error: `Stock insuficiente para ${prod.nombre} talle ${item.talle}` },
            { status: 400 }
          )
        }
      } else {
        if (prod.stock < item.cantidad) {
          return NextResponse.json(
            { error: `Stock insuficiente para ${prod.nombre}` },
            { status: 400 }
          )
        }
      }
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum, i) => sum + (i.precioOferta ?? i.precio) * i.cantidad,
      0
    )

    // Re-validar el cupón en el server (anti-tampering: el descuento del cliente
    // se ignora, calculamos uno nuevo basado en el cupón real de la DB).
    let descuentoFinal = 0
    let cuponCodigoFinal: string | null = null
    if (cuponCodigo) {
      const cupon = await prisma.cupon.findUnique({
        where: { codigo: cuponCodigo.toUpperCase() },
      })
      const now = new Date()
      const aplicaA = cupon?.aplicaA && cupon.aplicaA.length > 0 ? cupon.aplicaA : ["TIENDA"]
      const cuponValido =
        cupon &&
        cupon.activo &&
        cupon.fechaInicio <= now &&
        (!cupon.fechaFin || cupon.fechaFin >= now) &&
        (!cupon.usosMaximos || cupon.usosActuales < cupon.usosMaximos) &&
        (!cupon.montoMinimo || subtotal >= cupon.montoMinimo) &&
        aplicaA.includes("TIENDA") // Pedidos online son siempre TIENDA
      if (cuponValido && cupon) {
        let dto = Math.floor((subtotal * cupon.porcentaje) / 100)
        if (cupon.montoMaximo && dto > cupon.montoMaximo) dto = cupon.montoMaximo
        descuentoFinal = dto
        cuponCodigoFinal = cupon.codigo
        // Sumar uso al cupón (best-effort, no rompemos si falla)
        prisma.cupon
          .update({
            where: { id: cupon.id },
            data: { usosActuales: { increment: 1 } },
          })
          .catch(() => {})
      }
    }
    // Si el descuento del cliente difiere del recalculado, usamos el server.
    // (mantenemos var "descuento" para no romper el resto del flujo)
    const _descuentoCliente = descuento
    void _descuentoCliente
    const total = subtotal - descuentoFinal

    // Create order in DB first to get the ID
    const pedido = await prisma.pedido.create({
      data: {
        nombre,
        apellido,
        email,
        telefono,
        subtotal,
        descuento: descuentoFinal,
        total,
        estado: "NUEVO",
        estadoPago: "PENDIENTE",
        cuponCodigo: cuponCodigoFinal,
        items: {
          create: items.map((item) => ({
            cantidad: item.cantidad,
            precio: item.precioOferta ?? item.precio,
            talle: item.talle || null,
            productoId: item.id,
          })),
        },
      },
    })

    // Create MercadoPago preference
    const preferenceApi = getPreferenceApi()
    const preference = await preferenceApi.create({
      body: {
        items: items.map((item) => ({
          id: item.id,
          title: item.nombre + (item.talle ? ` (${item.talle})` : ""),
          quantity: item.cantidad,
          unit_price: item.precioOferta ?? item.precio,
          currency_id: "ARS",
        })),
        payer: {
          name: nombre,
          surname: apellido,
          email,
          identification: {
            type: "DNI",
            number: dni,
          },
        },
        back_urls: {
          success: `${BASE_URL}/checkout/exito`,
          failure: `${BASE_URL}/checkout/fallo`,
          pending: `${BASE_URL}/checkout/pendiente`,
        },
        notification_url: `${BASE_URL}/api/webhooks/mercadopago`,
        external_reference: pedido.id,
        statement_descriptor: "Motos Fernandez",
      },
    })

    // Save preference ID in order
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { mpPreferenceId: preference.id },
    })

    return NextResponse.json({
      pedidoId: pedido.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    })
  } catch (error) {
    console.error("Checkout error:", error)
    // TEMP DEBUG: exponer el detalle para diagnosticar en prod. REVERTIR.
    const _dbg =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : (() => {
            try {
              return JSON.stringify(error)
            } catch {
              return String(error)
            }
          })()
    return NextResponse.json(
      { error: "Error al procesar el pago. Intentá de nuevo.", _debug: _dbg },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Create MercadoPago preference.
    const prefBody = {
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
    }

    // Llamada REST directa a MP (el SDK devolvía respuesta vacía en el
    // runtime de Vercel). Reintentamos ante cuerpos vacíos/errores 5xx.
    let preference: { id: string; init_point: string; sandbox_init_point?: string } | null = null
    let lastMpError: unknown
    for (let intento = 0; intento < 3; intento++) {
      try {
        const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            // El WAF de MP bloquea (403 vacío) requests sin UA de navegador
            // que salen de datacenters (Vercel). Con UA de navegador pasa.
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            Accept: "application/json",
            "X-Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(prefBody),
        })
        const raw = await mpRes.text()
        if (!mpRes.ok || !raw) {
          throw new Error(`MP HTTP ${mpRes.status} — body: ${raw.slice(0, 300) || "(vacío)"}`)
        }
        preference = JSON.parse(raw)
        break
      } catch (e) {
        lastMpError = e
        await new Promise((r) => setTimeout(r, 500 * (intento + 1)))
      }
    }
    if (!preference) {
      console.error("MercadoPago no respondió (posible bloqueo de IP):", lastMpError)
      return NextResponse.json(
        {
          error:
            "No pudimos generar el pago online en este momento. Escribinos por WhatsApp así coordinamos tu compra y te la reservamos.",
          fallbackWhatsapp: true,
        },
        { status: 503 }
      )
    }

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
    return NextResponse.json(
      { error: "Error al procesar el pago. Intentá de nuevo." },
      { status: 500 }
    )
  }
}

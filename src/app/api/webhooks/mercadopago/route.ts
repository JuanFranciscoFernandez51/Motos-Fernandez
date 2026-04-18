import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPaymentApi } from "@/lib/mercadopago"
import { sendOrderConfirmation, notifyNewOrder } from "@/lib/email"

// MercadoPago validation endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.type === "payment") {
      const paymentId = body.data?.id
      if (!paymentId) {
        return NextResponse.json({ received: true })
      }

      // Fetch payment details from MercadoPago
      const paymentApi = getPaymentApi()
      const payment = await paymentApi.get({ id: paymentId })

      const externalReference = payment.external_reference
      if (!externalReference) {
        return NextResponse.json({ received: true })
      }

      // Find the order by ID
      const pedido = await prisma.pedido.findUnique({
        where: { id: externalReference },
      })

      if (!pedido) {
        console.error(`Webhook: Pedido not found for external_reference: ${externalReference}`)
        return NextResponse.json({ received: true })
      }

      // Update order based on payment status
      if (payment.status === "approved") {
        await prisma.pedido.update({
          where: { id: externalReference },
          data: {
            estadoPago: "APROBADO",
            estado: "PAGO_CONFIRMADO",
            mpPaymentId: String(paymentId),
            mpStatus: payment.status,
          },
        })

        // Fetch full order with items for email
        const pedidoCompleto = await prisma.pedido.findUnique({
          where: { id: externalReference },
          include: { items: { include: { producto: true } } },
        })

        if (pedidoCompleto) {
          const emailItems = pedidoCompleto.items.map((item) => ({
            nombre: item.producto.nombre,
            cantidad: item.cantidad,
            precio: item.precio,
            talle: item.talle,
          }))

          try {
            await sendOrderConfirmation({
              nombre: pedidoCompleto.nombre,
              apellido: pedidoCompleto.apellido,
              email: pedidoCompleto.email,
              numero: pedidoCompleto.numero,
              items: emailItems,
              subtotal: pedidoCompleto.subtotal,
              costoEnvio: pedidoCompleto.costoEnvio,
              descuento: pedidoCompleto.descuento,
              total: pedidoCompleto.total,
              tipoEntrega: pedidoCompleto.tipoEntrega,
            })
          } catch (e) {
            console.error("Email error:", e)
          }

          try {
            await notifyNewOrder({
              numero: pedidoCompleto.numero,
              nombre: pedidoCompleto.nombre,
              apellido: pedidoCompleto.apellido,
              total: pedidoCompleto.total,
              items: emailItems,
            })
          } catch (e) {
            console.error("Email error:", e)
          }
        }
      } else if (payment.status === "rejected") {
        await prisma.pedido.update({
          where: { id: externalReference },
          data: {
            estadoPago: "RECHAZADO",
            mpPaymentId: String(paymentId),
            mpStatus: payment.status,
          },
        })
      } else if (payment.status === "pending" || payment.status === "in_process") {
        await prisma.pedido.update({
          where: { id: externalReference },
          data: {
            mpPaymentId: String(paymentId),
            mpStatus: payment.status,
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("MercadoPago webhook error:", error)
    // Always return 200 to MP so it doesn't retry unnecessarily
    return NextResponse.json({ received: true })
  }
}

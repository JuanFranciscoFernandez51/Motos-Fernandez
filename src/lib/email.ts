import { Resend } from "resend"
import { BUSINESS, formatPrice, getWhatsAppUrl } from "./constants"

let resend: Resend | null = null

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error("RESEND_API_KEY no configurado")
    resend = new Resend(apiKey)
  }
  return resend
}

interface OrderEmailData {
  nombre: string
  apellido: string
  email: string
  numero: number
  items: { nombre: string; cantidad: number; precio: number; talle?: string | null }[]
  subtotal: number
  costoEnvio: number
  descuento: number
  total: number
  tipoEntrega: string
}

export async function sendOrderConfirmation(data: OrderEmailData) {
  const r = getResend()

  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.nombre}${item.talle ? ` (${item.talle})` : ""}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.precio * item.cantidad)}</td>
        </tr>`
    )
    .join("")

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #6B4F7A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${BUSINESS.name}</h1>
      </div>
      <div style="padding: 20px;">
        <h2>Pedido #${data.numero} confirmado</h2>
        <p>Hola ${data.nombre}, tu pedido fue registrado correctamente.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Producto</th>
              <th style="padding: 8px; text-align: center;">Cant.</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-top: 10px;">
          <p>Subtotal: ${formatPrice(data.subtotal)}</p>
          ${data.descuento > 0 ? `<p style="color: #9B59B6;">Descuento: -${formatPrice(data.descuento)}</p>` : ""}
          ${data.costoEnvio > 0 ? `<p>Envio: ${formatPrice(data.costoEnvio)}</p>` : ""}
          <p style="font-size: 18px; font-weight: bold;">Total: ${formatPrice(data.total)}</p>
        </div>
        <p>Tipo de entrega: ${data.tipoEntrega === "RETIRO_LOCAL" ? "Retiro en local" : "Envio a domicilio"}</p>
        <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px;">
          <p>Cualquier consulta, escribinos por WhatsApp:</p>
          <a href="${getWhatsAppUrl(`Hola! Consulta sobre mi pedido #${data.numero}`)}" style="color: #6B4F7A; font-weight: bold;">${BUSINESS.whatsappDisplay}</a>
        </div>
      </div>
      <div style="background: #171717; color: #999; padding: 15px; text-align: center; font-size: 12px;">
        <p>${BUSINESS.name} | ${BUSINESS.address}</p>
        <p>${BUSINESS.phone}</p>
      </div>
    </div>
  `

  return r.emails.send({
    from: `${BUSINESS.name} <noreply@motosfernandez.com.ar>`,
    to: data.email,
    subject: `Pedido #${data.numero} - ${BUSINESS.name}`,
    html,
  })
}

interface AdminNotificationData {
  nombre: string
  apellido: string
  pedidoId: string
  total: number
  items: { nombre: string; cantidad: number; precio: number }[]
}

export async function sendAdminNotification(data: AdminNotificationData) {
  const r = getResend()
  const adminEmail = process.env.ADMIN_EMAIL || "info@motosfernandez.com.ar"
  const referencia = data.pedidoId.slice(0, 8).toUpperCase()

  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.nombre}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.precio * item.cantidad)}</td>
        </tr>`
    )
    .join("")

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #6B4F7A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${BUSINESS.name}</h1>
      </div>
      <div style="padding: 20px;">
        <h2>Nueva venta confirmada</h2>
        <p><strong>Cliente:</strong> ${data.nombre} ${data.apellido}</p>
        <p><strong>Referencia:</strong> ${referencia}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Producto</th>
              <th style="padding: 8px; text-align: center;">Cant.</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-top: 10px;">
          <p style="font-size: 18px; font-weight: bold;">Total: ${formatPrice(data.total)}</p>
        </div>
      </div>
      <div style="background: #171717; color: #999; padding: 15px; text-align: center; font-size: 12px;">
        <p>${BUSINESS.name} | ${BUSINESS.address}</p>
      </div>
    </div>
  `

  return r.emails.send({
    from: `${BUSINESS.name} <noreply@motosfernandez.com.ar>`,
    to: adminEmail,
    subject: `Nueva venta confirmada - Motos Fernandez`,
    html,
  })
}

interface TurnoEmailData {
  nombre: string
  email: string
  tipoServicio: string
  fechaConfirmada: string
  modeloMoto?: string
}

export async function sendTurnoConfirmation(data: TurnoEmailData) {
  const r = getResend()

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #6B4F7A; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${BUSINESS.name}</h1>
      </div>
      <div style="padding: 20px;">
        <h2>Turno confirmado</h2>
        <p>Hola ${data.nombre}, tu turno fue confirmado:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Servicio:</strong> ${data.tipoServicio}</p>
          <p><strong>Fecha:</strong> ${data.fechaConfirmada}</p>
          ${data.modeloMoto ? `<p><strong>Vehiculo:</strong> ${data.modeloMoto}</p>` : ""}
          <p><strong>Direccion:</strong> ${BUSINESS.address}</p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px;">
          <p>Si necesitas reprogramar, avisanos por WhatsApp:</p>
          <a href="${getWhatsAppUrl(`Hola! Necesito reprogramar mi turno de ${data.tipoServicio}`)}" style="color: #6B4F7A; font-weight: bold;">${BUSINESS.whatsappDisplay}</a>
        </div>
      </div>
      <div style="background: #171717; color: #999; padding: 15px; text-align: center; font-size: 12px;">
        <p>${BUSINESS.name} | ${BUSINESS.address}</p>
      </div>
    </div>
  `

  return r.emails.send({
    from: `${BUSINESS.name} <noreply@motosfernandez.com.ar>`,
    to: data.email,
    subject: `Turno confirmado - ${BUSINESS.name}`,
    html,
  })
}

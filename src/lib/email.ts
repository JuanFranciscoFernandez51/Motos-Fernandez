import { Resend } from "resend"
import { BUSINESS, formatPrice, getWhatsAppUrl } from "./constants"

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return null
    resend = new Resend(apiKey)
  }
  return resend
}

// Sender: usar dominio verificado en Resend. Mientras no esté verificado,
// se puede usar onboarding@resend.dev como fallback desde env.
const FROM_ADDRESS =
  process.env.RESEND_FROM ||
  `${BUSINESS.name} <noreply@motosfernandez.com.ar>`

interface SendEmailArgs {
  to: string | string[]
  subject: string
  html: string
}

/**
 * Envia un email con Resend. Lazy-init: si RESEND_API_KEY no esta
 * configurada, loguea un warning y retorna { skipped: true } sin romper.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const r = getResend()
  if (!r) {
    console.warn(
      "[email] RESEND_API_KEY no configurado, se omite el envio de email"
    )
    return { skipped: true as const }
  }

  try {
    const result = await r.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })
    return { skipped: false as const, result }
  } catch (error) {
    console.error("[email] Error enviando email:", error)
    return { skipped: false as const, error }
  }
}

// ==================== TEMPLATE BASE ====================

function baseTemplate(titulo: string, bodyHtml: string) {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
      <div style="background: #7C3AED; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${BUSINESS.name}</h1>
        <p style="color: #e9d8f4; margin: 4px 0 0; font-size: 13px;">${titulo}</p>
      </div>
      <div style="padding: 24px; color: #1a1a1a; font-size: 14px; line-height: 1.5;">
        ${bodyHtml}
      </div>
      <div style="background: #f5f5f5; color: #666; padding: 14px; text-align: center; font-size: 11px;">
        Motos Fernandez &middot; Bahia Blanca
      </div>
    </div>
  `
}

// ==================== HELPERS DE NOTIFICACION INTERNA ====================

interface NewContactPayload {
  nombre: string
  email: string
  telefono?: string | null
  mensaje: string
}

export async function notifyNewContact(data: NewContactPayload) {
  const html = baseTemplate(
    "Nuevo mensaje de contacto",
    `
    <h2 style="margin: 0 0 12px; color: #7C3AED; font-size: 18px;">Nuevo mensaje desde la web</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Nombre</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.nombre}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${data.email}" style="color: #7C3AED;">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Telefono</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.telefono || "-"}</td>
      </tr>
    </table>
    <div style="background: #f5f5f5; padding: 12px; border-left: 3px solid #7C3AED; border-radius: 4px;">
      <p style="margin: 0 0 6px; font-weight: bold; color: #7C3AED;">Mensaje</p>
      <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(data.mensaje)}</p>
    </div>
    `
  )

  return sendEmail({
    to: BUSINESS.email,
    subject: `Nuevo contacto web - ${data.nombre}`,
    html,
  })
}

interface NewTurnoPayload {
  nombre: string
  telefono: string
  modeloMoto?: string | null
  tipoServicio: string
  fechaPreferida?: string | Date | null
}

export async function notifyNewTurno(data: NewTurnoPayload) {
  const fechaStr = data.fechaPreferida
    ? new Date(data.fechaPreferida).toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "short",
      })
    : "Sin fecha preferida"

  const html = baseTemplate(
    "Nuevo turno solicitado",
    `
    <h2 style="margin: 0 0 12px; color: #7C3AED; font-size: 18px;">Nuevo turno de servicio</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Cliente</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.nombre}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Telefono</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.telefono}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Vehiculo</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.modeloMoto || "-"}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Servicio</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.tipoServicio}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Fecha preferida</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${fechaStr}</td>
      </tr>
    </table>
    <p style="color: #666; font-size: 12px;">Revisa el panel admin para confirmar el turno.</p>
    `
  )

  return sendEmail({
    to: BUSINESS.email,
    subject: `Nuevo turno - ${data.nombre}`,
    html,
  })
}

interface NewOrderPayload {
  numero: number | string
  nombre: string
  apellido: string
  total: number
  items: { nombre: string; cantidad: number; precio: number }[]
}

export async function notifyNewOrder(data: NewOrderPayload) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.nombre}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.precio * item.cantidad)}</td>
      </tr>`
    )
    .join("")

  const html = baseTemplate(
    "Nueva venta",
    `
    <h2 style="margin: 0 0 12px; color: #7C3AED; font-size: 18px;">Pedido #${data.numero} confirmado</h2>
    <p style="margin: 0 0 12px;"><strong>Cliente:</strong> ${data.nombre} ${data.apellido}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 8px 0 16px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px; text-align: left;">Producto</th>
          <th style="padding: 8px; text-align: center;">Cant.</th>
          <th style="padding: 8px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="text-align: right; font-size: 16px; font-weight: bold; color: #7C3AED;">
      Total: ${formatPrice(data.total)}
    </div>
    `
  )

  return sendEmail({
    to: BUSINESS.email,
    subject: `Nueva venta #${data.numero} - ${data.nombre} ${data.apellido}`,
    html,
  })
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
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
      <div style="background: #7C3AED; padding: 20px; text-align: center;">
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
          <a href="${getWhatsAppUrl(`Hola! Consulta sobre mi pedido #${data.numero}`)}" style="color: #7C3AED; font-weight: bold;">${BUSINESS.whatsappDisplay}</a>
        </div>
      </div>
      <div style="background: #171717; color: #999; padding: 15px; text-align: center; font-size: 12px;">
        <p>${BUSINESS.name} | ${BUSINESS.address}</p>
        <p>${BUSINESS.phone}</p>
      </div>
    </div>
  `

  return sendEmail({
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
  const adminEmail = process.env.ADMIN_EMAIL || BUSINESS.email
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
      <div style="background: #7C3AED; padding: 20px; text-align: center;">
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

  return sendEmail({
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

export async function sendNewsletterWelcome(email: string, nombre?: string) {
  const saludo = nombre ? `Hola ${escapeHtml(nombre)},` : "¡Hola!"
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
      <div style="background: #7C3AED; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${BUSINESS.name}</h1>
        <p style="color: #e9d8f4; margin: 6px 0 0; font-size: 13px;">Gracias por suscribirte</p>
      </div>
      <div style="padding: 28px; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
        <h2 style="margin: 0 0 14px; color: #7C3AED; font-size: 20px;">${saludo}</h2>
        <p style="margin: 0 0 14px;">
          ¡Gracias por sumarte al newsletter de ${BUSINESS.name}! A partir de ahora vas a recibir
          primero las novedades: nuevos modelos, promos, eventos y oportunidades exclusivas.
        </p>
        <p style="margin: 0 0 22px;">
          Mientras tanto, pasate por el catálogo y mirá lo que tenemos para vos.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://motosfernandez.com.ar/catalogo"
             style="display: inline-block; background: #7C3AED; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px;">
            Ver catálogo
          </a>
        </div>
        <p style="margin: 20px 0 0; color: #666; font-size: 13px;">
          Si no te suscribiste vos, ignorá este mensaje.
        </p>
      </div>
      <div style="background: #f5f5f5; color: #666; padding: 14px; text-align: center; font-size: 11px;">
        ${BUSINESS.name} &middot; ${BUSINESS.address}
      </div>
    </div>
  `

  return sendEmail({
    to: email,
    subject: `Gracias por suscribirte - ${BUSINESS.name}`,
    html,
  })
}

// ==================== BIENVENIDA + CUPON ====================

interface BienvenidaCuponData {
  nombre: string
  email: string
  codigo: string
  porcentaje: number
}

export async function sendBienvenidaCupon(data: BienvenidaCuponData) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #3D2649 0%, #7C3AED 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: 1px;">¡BIENVENIDO!</h1>
        <p style="color: #e9d8f4; margin: 8px 0 0; font-size: 14px;">${BUSINESS.name}</p>
      </div>
      <div style="padding: 32px 24px; color: #1a1a1a; font-size: 15px; line-height: 1.6;">
        <h2 style="margin: 0 0 14px; color: #3D2649; font-size: 22px;">¡Hola ${escapeHtml(data.nombre)}!</h2>
        <p style="margin: 0 0 18px;">
          Gracias por sumarte a la familia ${BUSINESS.name}. Te damos la bienvenida con un
          <strong style="color: #7C3AED;">${data.porcentaje}% de descuento</strong> en
          <strong>tienda online</strong> y <strong>servicios de taller</strong>.
        </p>

        <!-- Cupón visual -->
        <div style="margin: 28px 0; padding: 24px; background: linear-gradient(135deg, #F8F5FA 0%, #EFEAF2 100%); border: 2px dashed #7C3AED; border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: bold; color: #7C3AED; letter-spacing: 2px; text-transform: uppercase;">
            Tu código de descuento
          </p>
          <p style="margin: 6px 0; font-size: 32px; font-weight: bold; color: #3D2649; letter-spacing: 3px; font-family: 'Courier New', monospace;">
            ${data.codigo}
          </p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #7C3AED; font-weight: bold;">
            ${data.porcentaje}% OFF · Válido por 30 días
          </p>
        </div>

        <p style="margin: 20px 0 12px; font-size: 14px;">
          <strong>¿Cómo usarlo?</strong>
        </p>
        <ul style="margin: 0 0 22px; padding-left: 20px; color: #444;">
          <li style="margin-bottom: 6px;">Ingresá a nuestra tienda y elegí lo que quieras</li>
          <li style="margin-bottom: 6px;">En el checkout, pegá el código <strong>${data.codigo}</strong></li>
          <li style="margin-bottom: 6px;">Para servicios de taller, mostrá este email al pedir turno</li>
        </ul>

        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="https://motosfernandez.com.ar/tienda"
             style="display: inline-block; background: linear-gradient(135deg, #3D2649 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: bold; font-size: 15px; letter-spacing: 0.5px;">
            Ir a la tienda
          </a>
        </div>

        <p style="margin: 24px 0 0; color: #888; font-size: 12px; text-align: center; font-style: italic;">
          Cualquier consulta, escribinos por WhatsApp:
          <a href="${getWhatsAppUrl("Hola! Tengo una consulta sobre el cupón de bienvenida.")}" style="color: #7C3AED; font-weight: bold;">${BUSINESS.whatsappDisplay}</a>
        </p>
      </div>
      <div style="background: #0E0B12; color: #999; padding: 16px; text-align: center; font-size: 11px;">
        <p style="margin: 0;">${BUSINESS.name} &middot; ${BUSINESS.address}</p>
      </div>
    </div>
  `

  return sendEmail({
    to: data.email,
    subject: `¡Tu ${data.porcentaje}% de descuento en ${BUSINESS.name}!`,
    html,
  })
}

export async function sendTurnoConfirmation(data: TurnoEmailData) {
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #7C3AED; padding: 20px; text-align: center;">
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
          <a href="${getWhatsAppUrl(`Hola! Necesito reprogramar mi turno de ${data.tipoServicio}`)}" style="color: #7C3AED; font-weight: bold;">${BUSINESS.whatsappDisplay}</a>
        </div>
      </div>
      <div style="background: #171717; color: #999; padding: 15px; text-align: center; font-size: 12px;">
        <p>${BUSINESS.name} | ${BUSINESS.address}</p>
      </div>
    </div>
  `

  return sendEmail({
    to: data.email,
    subject: `Turno confirmado - ${BUSINESS.name}`,
    html,
  })
}

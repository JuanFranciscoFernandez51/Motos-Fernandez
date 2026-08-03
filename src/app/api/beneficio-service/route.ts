import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { sendEmail } from "@/lib/email"
import { BUSINESS, getWhatsAppUrl } from "@/lib/constants"

export const dynamic = "force-dynamic"

const PORCENTAJE = 10
const VALIDEZ_MESES = 6

/** Código legible sin caracteres ambiguos (0/O, 1/I). */
function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let s = ""
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `SERVICE-${s}`
}

/**
 * POST /api/beneficio-service
 * Beneficio del QR de las carpetas: 10% en el próximo service.
 * Genera un cupón ÚNICO por persona (un solo uso, aplica a SERVICIOS),
 * lo devuelve para mostrar en pantalla, lo manda por mail y crea el lead.
 */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"
    if (!rateLimit(`beneficio-service:${ip}`, 8, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Probá de nuevo en un rato." },
        { status: 429 }
      )
    }

    const body = await req.json()
    const nombre = String(body?.nombre ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const telefono = String(body?.telefono ?? "").trim() || null

    if (!nombre) {
      return NextResponse.json({ error: "Decinos tu nombre." }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Poné un email válido." }, { status: 400 })
    }

    // Idempotente por email: si ya generó su beneficio y sigue activo, se lo
    // devolvemos (no le creamos uno nuevo cada vez que escanea).
    let cupon = await prisma.cupon.findFirst({
      where: {
        activo: true,
        aplicaA: { has: "SERVICIOS" },
        descripcion: { contains: email },
      },
      orderBy: { createdAt: "desc" },
    })

    let yaLoTenia = !!cupon

    if (!cupon) {
      // Generar código único (reintenta ante una colisión, muy improbable).
      let codigo = generarCodigo()
      for (let i = 0; i < 6; i++) {
        const dup = await prisma.cupon.findUnique({ where: { codigo } })
        if (!dup) break
        codigo = generarCodigo()
      }
      const fechaFin = new Date()
      fechaFin.setMonth(fechaFin.getMonth() + VALIDEZ_MESES)

      cupon = await prisma.cupon.create({
        data: {
          codigo,
          porcentaje: PORCENTAJE,
          aplicaA: ["SERVICIOS"],
          usosMaximos: 1,
          activo: true,
          fechaFin,
          descripcion: `Beneficio 10% service (QR carpeta) — ${nombre} · ${email}`,
        },
      })
      yaLoTenia = false
    }

    // Lead en el CRM — ya es cliente (le entregaron la moto).
    createOrUpdateLeadSafe(nombre, email, telefono, cupon.codigo)

    // Email best-effort (no bloquea; hoy solo llega si el dominio está verificado en Resend).
    enviarEmailBeneficio(nombre, email, cupon.codigo).catch(() => {})

    return NextResponse.json({ codigo: cupon.codigo, porcentaje: PORCENTAJE, yaLoTenia })
  } catch (e) {
    console.error("[beneficio-service] Error:", e)
    return NextResponse.json(
      { error: "No pudimos generar tu código. Probá de nuevo." },
      { status: 500 }
    )
  }
}

function createOrUpdateLeadSafe(
  nombre: string,
  email: string,
  telefono: string | null,
  codigo: string
) {
  import("@/lib/create-lead")
    .then(({ createOrUpdateLead }) =>
      createOrUpdateLead({
        nombre,
        email,
        telefono: telefono ?? undefined,
        origen: "WEB",
        temperatura: "CLIENTE",
        etapa: "VENDIDO",
        notas: `🔧 Beneficio 10% en su próximo service (QR de la carpeta de entrega). Código: ${codigo}`,
      })
    )
    .catch(() => {})
}

async function enviarEmailBeneficio(nombre: string, email: string, codigo: string) {
  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#fff;">
      <div style="background:linear-gradient(135deg,#3D2649,#7C3AED);padding:28px 20px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${BUSINESS.name}</h1>
        <p style="color:#e9d8f4;margin:6px 0 0;font-size:13px;">Gracias por elegirnos</p>
      </div>
      <div style="padding:30px 24px;color:#1a1a1a;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 14px;">¡Hola ${escapeHtml(nombre)}!</p>
        <p style="margin:0 0 18px;">
          Como agradecimiento por confiar en nosotros, te dejamos un
          <strong style="color:#7C3AED;">10% de descuento en tu próximo service</strong> en nuestro taller.
        </p>
        <div style="margin:24px 0;padding:22px;background:#F8F5FA;border:2px dashed #7C3AED;border-radius:12px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:bold;color:#7C3AED;letter-spacing:2px;text-transform:uppercase;">Tu código</p>
          <p style="margin:6px 0;font-size:30px;font-weight:bold;color:#3D2649;letter-spacing:3px;font-family:'Courier New',monospace;">${codigo}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#7C3AED;font-weight:bold;">10% OFF · Válido por 6 meses</p>
        </div>
        <p style="margin:0 0 8px;"><strong>¿Cómo usarlo?</strong></p>
        <p style="margin:0 0 18px;color:#444;">Mostrá este código cuando traigas la moto al taller y te aplicamos el descuento. Es de un solo uso.</p>
        <p style="margin:20px 0 0;color:#888;font-size:13px;text-align:center;">
          Cualquier consulta o para sacar turno, escribinos:
          <a href="${getWhatsAppUrl("Hola! Quiero usar mi 10% de descuento en el service.")}" style="color:#7C3AED;font-weight:bold;">${BUSINESS.whatsappDisplay}</a>
        </p>
      </div>
      <div style="background:#0E0B12;color:#999;padding:16px;text-align:center;font-size:11px;">
        ${BUSINESS.name} · ${BUSINESS.address}
      </div>
    </div>
  `
  return sendEmail({
    to: email,
    subject: `Tu 10% de descuento en el service - ${BUSINESS.name}`,
    html,
  })
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

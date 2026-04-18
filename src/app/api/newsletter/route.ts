import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { sendNewsletterWelcome } from "@/lib/email"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    // 5 req/hora/IP
    if (!rateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Probá de nuevo en un rato." },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Datos invalidos" },
        { status: 400 }
      )
    }

    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const nombre =
      typeof body.nombre === "string" && body.nombre.trim().length > 0
        ? body.nombre.trim().slice(0, 100)
        : null
    const origen =
      typeof body.origen === "string" && body.origen.trim().length > 0
        ? body.origen.trim().slice(0, 50)
        : null

    if (!emailRaw || !EMAIL_REGEX.test(emailRaw) || emailRaw.length > 200) {
      return NextResponse.json(
        { error: "Ingresá un email válido" },
        { status: 400 }
      )
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: emailRaw },
    })

    let created = false

    if (existing) {
      if (existing.activo) {
        return NextResponse.json({
          success: true,
          message: "Ya estás suscripto. ¡Gracias!",
        })
      }

      await prisma.newsletterSubscriber.update({
        where: { email: emailRaw },
        data: {
          activo: true,
          nombre: nombre ?? existing.nombre,
          origen: origen ?? existing.origen,
        },
      })
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email: emailRaw,
          nombre,
          origen,
        },
      })
      created = true
    }

    // Email de bienvenida (best effort, no rompe si falla)
    if (created) {
      try {
        await sendNewsletterWelcome(emailRaw, nombre ?? undefined)
      } catch (err) {
        console.error("[newsletter] Error enviando welcome email:", err)
      }
    }

    return NextResponse.json({
      success: true,
      message: "¡Listo! Te suscribiste correctamente.",
    })
  } catch (error) {
    console.error("[newsletter] Error:", error)
    return NextResponse.json(
      { error: "No pudimos procesar tu suscripción. Intentá de nuevo." },
      { status: 500 }
    )
  }
}

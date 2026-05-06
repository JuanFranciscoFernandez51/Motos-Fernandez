import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBienvenidaCupon } from "@/lib/email"

const CODIGO_CUPON = "BIENVENIDA10"
const PORCENTAJE = 10
const VALIDEZ_DIAS = 30

/**
 * Endpoint público para el popup de bienvenida.
 * - Crea/asegura el cupón BIENVENIDA10 en la DB (idempotente)
 * - Guarda el lead como suscriptor del newsletter
 * - Envía el email con el código del cupón
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nombre = String(body?.nombre ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const telefono = String(body?.telefono ?? "").trim()

    // Validaciones básicas
    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "El nombre es obligatorio" },
        { status: 400 }
      )
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Email inválido" },
        { status: 400 }
      )
    }
    if (!telefono) {
      return NextResponse.json(
        { ok: false, error: "El teléfono es obligatorio" },
        { status: 400 }
      )
    }

    // 1) Asegurar que el cupón BIENVENIDA10 existe (upsert)
    const fechaFin = new Date()
    fechaFin.setDate(fechaFin.getDate() + VALIDEZ_DIAS)

    await prisma.cupon.upsert({
      where: { codigo: CODIGO_CUPON },
      create: {
        codigo: CODIGO_CUPON,
        descripcion: "Cupón de bienvenida — 10% off en tienda y servicios (NO aplica a motos)",
        porcentaje: PORCENTAJE,
        montoMinimo: null,
        montoMaximo: null,
        usosMaximos: null, // ilimitado
        activo: true,
        fechaInicio: new Date(),
        aplicaA: ["TIENDA", "SERVICIOS"],
        // No le ponemos fechaFin: queremos que el cupón quede activo de forma
        // permanente (el descuento es para todos los nuevos suscriptores).
        // El "30 días" es una sugerencia visual en el email, no se enforza.
      },
      update: {
        // Si ya existe, asegurar que aplica a TIENDA + SERVICIOS y está activo
        activo: true,
        aplicaA: ["TIENDA", "SERVICIOS"],
      },
    })

    // 2) Guardar el lead como suscriptor del newsletter (con upsert por email)
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        nombre,
        origen: "popup-bienvenida",
        activo: true,
      },
      update: {
        // Si ya estaba, actualizar nombre y reactivar
        nombre,
        activo: true,
      },
    })

    // 3) Crear/actualizar Lead (CRM)
    try {
      const partes = nombre.trim().split(/\s+/)
      const nombrePila = partes[0] || nombre
      const apellido = partes.length > 1 ? partes.slice(1).join(" ") : null

      await prisma.lead.create({
        data: {
          nombre: nombrePila,
          apellido,
          email,
          telefono,
          origen: "WEB",
          temperatura: "NUEVO",
          etapa: "NUEVO",
          notas: "Lead capturado por popup de bienvenida (cupón 10%).",
        },
      })
    } catch (e) {
      // Si falla por duplicado o algo, seguimos — no es crítico
      console.warn("[bienvenida] Lead no creado:", e)
    }

    // 4) Enviar email con el cupón
    await sendBienvenidaCupon({
      nombre,
      email,
      codigo: CODIGO_CUPON,
      porcentaje: PORCENTAJE,
    })

    return NextResponse.json({ ok: true, codigo: CODIGO_CUPON })
  } catch (e) {
    console.error("[bienvenida] Error:", e)
    return NextResponse.json(
      { ok: false, error: "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
}

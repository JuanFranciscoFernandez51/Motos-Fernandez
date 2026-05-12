import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOrUpdateLead } from "@/lib/create-lead"
import { notifyNewTurno } from "@/lib/email"

/**
 * Crea un turno desde la web pública. Todos los campos son obligatorios
 * (nombre, dni, telefono, email, modeloMoto, tipoServicio) para que el
 * admin tenga toda la info necesaria al revisar el turno y opcionalmente
 * convertirlo en cliente del CRM.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validación de campos obligatorios. El front también valida pero
    // duplicamos acá por seguridad — un cliente puede hardcodear el JSON.
    const nombre = String(body.nombre ?? "").trim()
    const dni = String(body.dni ?? "").trim()
    const telefono = String(body.telefono ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const modeloMoto = String(body.modeloMoto ?? "").trim()
    const tipoServicio = String(body.tipoServicio ?? "").trim()

    if (!nombre) return jsonError("El nombre es obligatorio")
    if (!dni) return jsonError("El DNI es obligatorio")
    if (!telefono) return jsonError("El teléfono/celular es obligatorio")
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Email inválido")
    }
    if (!modeloMoto) return jsonError("La moto es obligatoria")
    if (!tipoServicio) return jsonError("El tipo de servicio es obligatorio")

    const turno = await prisma.turno.create({
      data: {
        nombre,
        dni,
        telefono,
        email,
        modeloMoto,
        modeloId: body.modeloId ?? null,
        tipoServicio,
        fechaPreferida: body.fechaPreferida ? new Date(body.fechaPreferida) : null,
        comentarios: body.comentarios ? String(body.comentarios) : null,
        estado: "PENDIENTE",
      },
    })

    // Crear/actualizar lead asociado al CRM. NO creamos cliente
    // automáticamente — el admin decide si guardarlo o no.
    await createOrUpdateLead({
      nombre,
      telefono,
      email,
      modeloInteres: modeloMoto,
      modeloId: body.modeloId ?? null,
      origen: "WEB",
      temperatura: "TIBIO",
      notas: `Turno solicitado por la web — Servicio: ${tipoServicio}. DNI: ${dni}.${body.comentarios ? ` Comentario: ${body.comentarios}` : ""}`,
    })

    // Notificacion por email al admin (fire-and-forget)
    try {
      await notifyNewTurno({
        nombre,
        telefono,
        modeloMoto,
        tipoServicio,
        fechaPreferida: body.fechaPreferida ?? null,
      })
    } catch (emailError) {
      console.error("Error enviando notificacion de turno:", emailError)
    }

    return NextResponse.json(turno, { status: 201 })
  } catch (error) {
    console.error("Error creating turno:", error)
    return NextResponse.json(
      { error: "Error al crear el turno" },
      { status: 500 }
    )
  }
}

function jsonError(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

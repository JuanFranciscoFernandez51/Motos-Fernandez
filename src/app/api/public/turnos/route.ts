import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOrUpdateLead } from "@/lib/create-lead"
import { notifyNewTurno } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const turno = await prisma.turno.create({
      data: {
        nombre: body.nombre,
        telefono: body.telefono,
        email: body.email ?? null,
        modeloMoto: body.modeloMoto ?? null,
        modeloId: body.modeloId ?? null,
        tipoServicio: body.tipoServicio,
        fechaPreferida: body.fechaPreferida ? new Date(body.fechaPreferida) : null,
        comentarios: body.comentarios ?? null,
        estado: "PENDIENTE",
      },
    })

    // Create or update lead from turno data
    await createOrUpdateLead({
      nombre: body.nombre,
      telefono: body.telefono,
      email: body.email,
      modeloInteres: body.modeloMoto,
      modeloId: body.modeloId,
      origen: "WEB",
      temperatura: "TIBIO",
      notas: `Turno solicitado: ${body.tipoServicio}${body.comentarios ? ` - ${body.comentarios}` : ""}`,
    })

    // Notificacion por email al admin (fire-and-forget)
    try {
      await notifyNewTurno({
        nombre: body.nombre,
        telefono: body.telefono,
        modeloMoto: body.modeloMoto,
        tipoServicio: body.tipoServicio,
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

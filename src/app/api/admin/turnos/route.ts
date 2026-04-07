import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const turnos = await prisma.turno.findMany({
    include: { modelo: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(turnos)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

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
        fechaConfirmada: body.fechaConfirmada ? new Date(body.fechaConfirmada) : null,
        comentarios: body.comentarios ?? null,
        estado: body.estado ?? "PENDIENTE",
      },
    })

    return NextResponse.json(turno, { status: 201 })
  } catch (error) {
    console.error("Error creating turno:", error)
    return NextResponse.json(
      { error: "Error al crear el turno" },
      { status: 500 }
    )
  }
}

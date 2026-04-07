import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const turno = await prisma.turno.findUnique({
    where: { id },
    include: { modelo: true },
  })

  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
  }

  return NextResponse.json(turno)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        estado: body.estado,
        fechaConfirmada: body.fechaConfirmada ? new Date(body.fechaConfirmada) : undefined,
      },
    })

    return NextResponse.json(turno)
  } catch (error) {
    console.error("Error updating turno:", error)
    return NextResponse.json(
      { error: "Error al actualizar el turno" },
      { status: 500 }
    )
  }
}

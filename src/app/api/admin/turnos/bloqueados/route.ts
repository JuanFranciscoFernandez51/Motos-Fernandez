import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const dias = await prisma.diaBloqueado.findMany({
    orderBy: { fecha: "asc" },
  })

  return NextResponse.json(dias)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const dia = await prisma.diaBloqueado.create({
      data: {
        fecha: new Date(body.fecha),
        motivo: body.motivo ?? null,
      },
    })

    return NextResponse.json(dia, { status: 201 })
  } catch (error) {
    console.error("Error creating dia bloqueado:", error)
    return NextResponse.json(
      { error: "Error al bloquear el día" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")

    if (!fecha) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 })
    }

    await prisma.diaBloqueado.delete({
      where: { fecha: new Date(fecha) },
    })

    return NextResponse.json({ message: "Día desbloqueado" })
  } catch (error) {
    console.error("Error deleting dia bloqueado:", error)
    return NextResponse.json(
      { error: "Error al desbloquear el día" },
      { status: 500 }
    )
  }
}

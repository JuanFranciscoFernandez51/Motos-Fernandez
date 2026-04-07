import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function POST(
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

    const interaction = await prisma.leadInteraction.create({
      data: {
        tipo: body.tipo,
        contenido: body.contenido,
        leadId: id,
      },
    })

    return NextResponse.json(interaction, { status: 201 })
  } catch (error) {
    console.error("Error creating interaction:", error)
    return NextResponse.json(
      { error: "Error al crear la interacción" },
      { status: 500 }
    )
  }
}

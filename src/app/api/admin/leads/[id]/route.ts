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

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      interacciones: { orderBy: { createdAt: "desc" } },
      recordatorios: { orderBy: { fecha: "asc" } },
      modelo: true,
    },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 })
  }

  return NextResponse.json(lead)
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

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        nombre: body.nombre,
        apellido: body.apellido,
        telefono: body.telefono,
        email: body.email,
        ciudad: body.ciudad,
        modeloInteres: body.modeloInteres,
        modeloId: body.modeloId,
        origen: body.origen,
        temperatura: body.temperatura,
        etapa: body.etapa,
        notas: body.notas,
      },
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error("Error updating lead:", error)
    return NextResponse.json(
      { error: "Error al actualizar el lead" },
      { status: 500 }
    )
  }
}

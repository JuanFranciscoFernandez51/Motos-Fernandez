import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const leads = await prisma.lead.findMany({
    include: { modelo: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(leads)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const lead = await prisma.lead.create({
      data: {
        nombre: body.nombre,
        apellido: body.apellido ?? null,
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        ciudad: body.ciudad ?? null,
        modeloInteres: body.modeloInteres ?? null,
        modeloId: body.modeloId ?? null,
        origen: body.origen ?? "WEB",
        temperatura: body.temperatura ?? "NUEVO",
        etapa: body.etapa ?? "NUEVO",
        notas: body.notas ?? null,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error("Error creating lead:", error)
    return NextResponse.json(
      { error: "Error al crear el lead" },
      { status: 500 }
    )
  }
}

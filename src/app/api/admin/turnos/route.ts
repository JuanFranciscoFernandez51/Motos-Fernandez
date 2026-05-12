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

    // Validación: mismos obligatorios que el form publico
    const nombre = String(body.nombre ?? "").trim()
    const dni = String(body.dni ?? "").trim()
    const telefono = String(body.telefono ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const modeloMoto = String(body.modeloMoto ?? "").trim()
    const tipoServicio = String(body.tipoServicio ?? "").trim()

    if (!nombre) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 })
    if (!dni) return NextResponse.json({ error: "DNI obligatorio" }, { status: 400 })
    if (!telefono) return NextResponse.json({ error: "Celular obligatorio" }, { status: 400 })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }
    if (!modeloMoto) return NextResponse.json({ error: "Moto obligatoria" }, { status: 400 })
    if (!tipoServicio) return NextResponse.json({ error: "Tipo de servicio obligatorio" }, { status: 400 })

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
        fechaConfirmada: body.fechaConfirmada ? new Date(body.fechaConfirmada) : null,
        comentarios: body.comentarios ? String(body.comentarios) : null,
        clienteId: body.clienteId ?? null,
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

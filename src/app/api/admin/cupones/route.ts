import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const cupones = await prisma.cupon.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(cupones)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const cupon = await prisma.cupon.create({
      data: {
        codigo: body.codigo.toUpperCase(),
        descripcion: body.descripcion ?? null,
        porcentaje: body.porcentaje,
        montoMaximo: body.montoMaximo ?? null,
        montoMinimo: body.montoMinimo ?? null,
        usosMaximos: body.usosMaximos ?? null,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : new Date(),
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        activo: body.activo ?? true,
      },
    })

    return NextResponse.json(cupon, { status: 201 })
  } catch (error) {
    console.error("Error creating cupon:", error)
    return NextResponse.json(
      { error: "Error al crear el cupón" },
      { status: 500 }
    )
  }
}

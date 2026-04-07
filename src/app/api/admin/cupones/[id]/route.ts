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

  const cupon = await prisma.cupon.findUnique({
    where: { id },
  })

  if (!cupon) {
    return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 })
  }

  return NextResponse.json(cupon)
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

    const cupon = await prisma.cupon.update({
      where: { id },
      data: {
        codigo: body.codigo?.toUpperCase(),
        descripcion: body.descripcion,
        porcentaje: body.porcentaje,
        montoMaximo: body.montoMaximo,
        montoMinimo: body.montoMinimo,
        usosMaximos: body.usosMaximos,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : undefined,
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : undefined,
        activo: body.activo,
      },
    })

    return NextResponse.json(cupon)
  } catch (error) {
    console.error("Error updating cupon:", error)
    return NextResponse.json(
      { error: "Error al actualizar el cupón" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.cupon.delete({ where: { id } })
    return NextResponse.json({ message: "Cupón eliminado" })
  } catch (error) {
    console.error("Error deleting cupon:", error)
    return NextResponse.json(
      { error: "Error al eliminar el cupón" },
      { status: 500 }
    )
  }
}

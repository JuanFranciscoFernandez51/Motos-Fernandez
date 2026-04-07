import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const promociones = await prisma.promocion.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(promociones)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const promocion = await prisma.promocion.create({
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion ?? null,
        imagen: body.imagen ?? null,
        link: body.link ?? null,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        activo: body.activo ?? true,
      },
    })

    return NextResponse.json(promocion, { status: 201 })
  } catch (error) {
    console.error("Error creating promocion:", error)
    return NextResponse.json(
      { error: "Error al crear la promoción" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const body = await request.json()

    const promocion = await prisma.promocion.update({
      where: { id },
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion,
        imagen: body.imagen,
        link: body.link,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : undefined,
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : undefined,
        activo: body.activo,
      },
    })

    return NextResponse.json(promocion)
  } catch (error) {
    console.error("Error updating promocion:", error)
    return NextResponse.json(
      { error: "Error al actualizar la promoción" },
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
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    await prisma.promocion.delete({ where: { id } })
    return NextResponse.json({ message: "Promoción eliminada" })
  } catch (error) {
    console.error("Error deleting promocion:", error)
    return NextResponse.json(
      { error: "Error al eliminar la promoción" },
      { status: 500 }
    )
  }
}

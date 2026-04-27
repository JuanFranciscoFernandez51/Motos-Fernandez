import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { invalidateModelos } from "@/lib/cached-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const modelo = await prisma.modelo.findUnique({
    where: { id },
    include: { colores: true },
  })

  if (!modelo) {
    return NextResponse.json({ error: "Modelo no encontrado" }, { status: 404 })
  }

  return NextResponse.json(modelo)
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

    const modelo = await prisma.modelo.update({
      where: { id },
      data: {
        nombre: body.nombre,
        slug: body.slug,
        marca: body.marca,
        categoriaVehiculo: body.categoriaVehiculo,
        cilindrada: body.cilindrada,
        precio: body.precio,
        descripcion: body.descripcion,
        specs: body.specs,
        fotos: body.fotos,
        activo: body.activo,
        destacado: body.destacado,
        orden: body.orden,
      },
    })

    invalidateModelos(modelo.slug)
    return NextResponse.json(modelo)
  } catch (error) {
    console.error("Error updating modelo:", error)
    return NextResponse.json(
      { error: "Error al actualizar el modelo" },
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
    const deleted = await prisma.modelo.delete({ where: { id } })
    invalidateModelos(deleted.slug)
    return NextResponse.json({ message: "Modelo eliminado" })
  } catch (error) {
    console.error("Error deleting modelo:", error)
    return NextResponse.json(
      { error: "Error al eliminar el modelo" },
      { status: 500 }
    )
  }
}

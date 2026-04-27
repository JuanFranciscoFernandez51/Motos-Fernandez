import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { invalidateProductos } from "@/lib/cached-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params

  const producto = await prisma.producto.findUnique({
    where: { id },
    include: { categoria: true },
  })

  if (!producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  }

  return NextResponse.json(producto)
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

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        codigo: body.codigo,
        nombre: body.nombre,
        slug: body.slug,
        precio: body.precio,
        precioOferta: body.precioOferta,
        descripcion: body.descripcion,
        fotos: body.fotos,
        stock: body.stock,
        talles: body.talles,
        stockPorTalle: body.stockPorTalle,
        motoCompatible: body.motoCompatible,
        activo: body.activo,
        destacado: body.destacado,
        categoriaId: body.categoriaId,
      },
    })

    invalidateProductos(producto.slug)
    return NextResponse.json(producto)
  } catch (error) {
    console.error("Error updating producto:", error)
    return NextResponse.json(
      { error: "Error al actualizar el producto" },
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
    const deleted = await prisma.producto.delete({ where: { id } })
    invalidateProductos(deleted.slug)
    return NextResponse.json({ message: "Producto eliminado" })
  } catch (error) {
    console.error("Error deleting producto:", error)
    return NextResponse.json(
      { error: "Error al eliminar el producto" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { invalidateProductos } from "@/lib/cached-queries"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const productos = await prisma.producto.findMany({
    include: { categoria: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(productos)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const producto = await prisma.producto.create({
      data: {
        codigo: body.codigo ?? null,
        nombre: body.nombre,
        slug: body.slug,
        precio: body.precio,
        precioOferta: body.precioOferta ?? null,
        descripcion: body.descripcion ?? null,
        fotos: body.fotos ?? [],
        stock: body.stock ?? 0,
        talles: body.talles ?? [],
        stockPorTalle: body.stockPorTalle ?? null,
        motoCompatible: body.motoCompatible ?? null,
        activo: body.activo ?? true,
        destacado: body.destacado ?? false,
        categoriaId: body.categoriaId,
      },
    })

    invalidateProductos(producto.slug)
    return NextResponse.json(producto, { status: 201 })
  } catch (error) {
    console.error("Error creating producto:", error)
    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    )
  }
}

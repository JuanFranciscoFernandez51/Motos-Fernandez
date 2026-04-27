import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { invalidateModelos } from "@/lib/cached-queries"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const modelos = await prisma.modelo.findMany({
    include: { colores: true },
    orderBy: { orden: "asc" },
  })

  return NextResponse.json(modelos)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const modelo = await prisma.modelo.create({
      data: {
        nombre: body.nombre,
        slug: body.slug,
        marca: body.marca,
        categoriaVehiculo: body.categoriaVehiculo ?? "MOTOCICLETA",
        cilindrada: body.cilindrada ?? null,
        precio: body.precio ?? null,
        descripcion: body.descripcion ?? null,
        specs: body.specs ?? null,
        fotos: body.fotos ?? [],
        activo: body.activo ?? true,
        destacado: body.destacado ?? false,
        orden: body.orden ?? 0,
      },
    })

    invalidateModelos(modelo.slug)
    return NextResponse.json(modelo, { status: 201 })
  } catch (error) {
    console.error("Error creating modelo:", error)
    return NextResponse.json(
      { error: "Error al crear el modelo" },
      { status: 500 }
    )
  }
}

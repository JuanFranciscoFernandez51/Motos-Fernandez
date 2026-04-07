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

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      items: {
        include: { producto: true },
      },
    },
  })

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
  }

  return NextResponse.json(pedido)
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

    const pedido = await prisma.pedido.update({
      where: { id },
      data: {
        estado: body.estado,
        estadoPago: body.estadoPago,
        trackingNumber: body.trackingNumber,
        trackingCompany: body.trackingCompany,
        notas: body.notas,
      },
    })

    return NextResponse.json(pedido)
  } catch (error) {
    console.error("Error updating pedido:", error)
    return NextResponse.json(
      { error: "Error al actualizar el pedido" },
      { status: 500 }
    )
  }
}

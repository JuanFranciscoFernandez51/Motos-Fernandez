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

  const noticia = await prisma.noticia.findUnique({
    where: { id },
  })

  if (!noticia) {
    return NextResponse.json({ error: "Noticia no encontrada" }, { status: 404 })
  }

  return NextResponse.json(noticia)
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

    const noticia = await prisma.noticia.update({
      where: { id },
      data: {
        titulo: body.titulo,
        slug: body.slug,
        contenido: body.contenido,
        resumen: body.resumen,
        imagen: body.imagen,
        categoria: body.categoria,
        publicado: body.publicado,
        destacado: body.destacado,
        fechaPublicacion: body.fechaPublicacion ? new Date(body.fechaPublicacion) : undefined,
      },
    })

    return NextResponse.json(noticia)
  } catch (error) {
    console.error("Error updating noticia:", error)
    return NextResponse.json(
      { error: "Error al actualizar la noticia" },
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
    await prisma.noticia.delete({ where: { id } })
    return NextResponse.json({ message: "Noticia eliminada" })
  } catch (error) {
    console.error("Error deleting noticia:", error)
    return NextResponse.json(
      { error: "Error al eliminar la noticia" },
      { status: 500 }
    )
  }
}

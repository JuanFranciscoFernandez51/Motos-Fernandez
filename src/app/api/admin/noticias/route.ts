import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const noticias = await prisma.noticia.findMany({
    orderBy: { fechaPublicacion: "desc" },
  })

  return NextResponse.json(noticias)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    const noticia = await prisma.noticia.create({
      data: {
        titulo: body.titulo,
        slug: body.slug,
        contenido: body.contenido,
        resumen: body.resumen ?? null,
        imagen: body.imagen ?? null,
        categoria: body.categoria ?? null,
        publicado: body.publicado ?? false,
        destacado: body.destacado ?? false,
        fechaPublicacion: body.fechaPublicacion ? new Date(body.fechaPublicacion) : new Date(),
      },
    })

    return NextResponse.json(noticia, { status: 201 })
  } catch (error) {
    console.error("Error creating noticia:", error)
    return NextResponse.json(
      { error: "Error al crear la noticia" },
      { status: 500 }
    )
  }
}

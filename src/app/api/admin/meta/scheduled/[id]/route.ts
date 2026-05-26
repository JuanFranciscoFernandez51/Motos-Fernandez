import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { scheduledPostPatchSchema } from "@/lib/meta/scheduled"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/meta/scheduled/[id] — detalle de un post programado.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const post = await prisma.scheduledPost.findUnique({
    where: { id },
    include: {
      moto: {
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          fotos: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!post) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ post })
}

/**
 * PATCH — solo permitido si el post sigue PENDING (sino ya está siendo
 * procesado o publicado y editar no tiene sentido).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = scheduledPostPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existente = await prisma.scheduledPost.findUnique({
    where: { id },
    select: { status: true },
  })
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (existente.status !== "PENDING") {
    return NextResponse.json(
      {
        error: `Solo se puede editar un post en estado PENDING (este está ${existente.status}).`,
      },
      { status: 409 }
    )
  }

  const post = await prisma.scheduledPost.update({
    where: { id },
    data: {
      ...(parsed.data.platforms ? { platforms: parsed.data.platforms } : {}),
      ...(parsed.data.scheduledAt ? { scheduledAt: parsed.data.scheduledAt } : {}),
      ...(parsed.data.customCaption !== undefined
        ? { customCaption: parsed.data.customCaption }
        : {}),
    },
  })
  return NextResponse.json({ post })
}

/**
 * DELETE — soft cancel. No se borra de la DB, pasa a CANCELLED para
 * conservar historial. Solo PENDING puede cancelarse.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const existente = await prisma.scheduledPost.findUnique({
    where: { id },
    select: { status: true },
  })
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (existente.status !== "PENDING") {
    return NextResponse.json(
      {
        error: `Solo se puede cancelar un post PENDING (este está ${existente.status}).`,
      },
      { status: 409 }
    )
  }

  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "CANCELLED" },
  })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import {
  scheduledPostCreateSchema,
  scheduledPostListSchema,
} from "@/lib/meta/scheduled"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/meta/scheduled
 * Lista de posts programados con filtros opcionales (from, to, status,
 * motoId). Ordenados por scheduledAt asc para que la UI calendaria los
 * pinte en orden cronológico.
 */
export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const parsed = scheduledPostListSchema.safeParse({
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    status: url.searchParams.get("status") || undefined,
    motoId: url.searchParams.get("motoId") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query inválida", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { from, to, status, motoId, limit } = parsed.data

  const posts = await prisma.scheduledPost.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(motoId ? { motoId } : {}),
      ...(from || to
        ? {
            scheduledAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      moto: {
        select: { id: true, slug: true, marca: true, nombre: true, fotos: true },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  })

  return NextResponse.json({ posts, count: posts.length })
}

/**
 * POST /api/admin/meta/scheduled
 * Crea un post programado en PENDING. La validación de la moto
 * (activeForMarketing, tiene fotos) ocurre acá para fallar temprano.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = scheduledPostCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data

  // La moto tiene que existir, estar activa para marketing y tener fotos.
  const moto = await prisma.modelo.findUnique({
    where: { id: data.motoId },
    select: {
      id: true,
      activeForMarketing: true,
      vendida: true,
      activo: true,
      fotos: true,
    },
  })
  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 })
  }
  if (!moto.activeForMarketing) {
    return NextResponse.json(
      { error: "Esta moto está marcada como inactiva para marketing." },
      { status: 400 }
    )
  }
  if (moto.vendida) {
    return NextResponse.json({ error: "La moto está vendida" }, { status: 400 })
  }
  if (moto.fotos.length === 0) {
    return NextResponse.json(
      { error: "La moto no tiene fotos cargadas — IG necesita al menos una." },
      { status: 400 }
    )
  }

  // Evitar duplicado obvio: si ya hay un post PENDING para la misma moto
  // dentro de ±4 horas, alertamos (el brief lo pide en §8.1).
  const ventana = 4 * 60 * 60 * 1000
  const overlap = await prisma.scheduledPost.findFirst({
    where: {
      motoId: data.motoId,
      status: { in: ["PENDING", "PROCESSING"] },
      scheduledAt: {
        gte: new Date(data.scheduledAt.getTime() - ventana),
        lte: new Date(data.scheduledAt.getTime() + ventana),
      },
    },
    select: { id: true, scheduledAt: true },
  })
  if (overlap) {
    return NextResponse.json(
      {
        error: `Ya hay un post programado de esta moto cerca de la fecha pedida (${overlap.scheduledAt.toISOString()}). Diferenciá al menos 4 horas.`,
      },
      { status: 409 }
    )
  }

  const post = await prisma.scheduledPost.create({
    data: {
      motoId: data.motoId,
      platforms: data.platforms,
      scheduledAt: data.scheduledAt,
      customCaption: data.customCaption || null,
      status: "PENDING",
      createdById: (session as { id?: string }).id || null,
    },
    include: {
      moto: { select: { id: true, slug: true, marca: true, nombre: true } },
    },
  })

  return NextResponse.json({ post }, { status: 201 })
}

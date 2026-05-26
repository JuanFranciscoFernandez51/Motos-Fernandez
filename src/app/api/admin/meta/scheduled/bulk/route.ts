import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { scheduledPostBulkSchema } from "@/lib/meta/scheduled"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/admin/meta/scheduled/bulk
 * Crea N posts de la misma moto en distintas fechas. Útil para campañas
 * tipo "publicar todos los lunes a las 10 AM durante 4 semanas" — el
 * cliente arma la grilla de fechas y nos las manda.
 *
 * Valida la moto una sola vez, valida cada fecha individualmente.
 * Si alguna fecha tiene overlap con otro PENDING/PROCESSING, salta
 * esa y reporta cuántas crearon vs cuántas saltaron.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = scheduledPostBulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data

  const moto = await prisma.modelo.findUnique({
    where: { id: data.motoId },
    select: { id: true, activeForMarketing: true, vendida: true, fotos: true },
  })
  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 })
  }
  if (!moto.activeForMarketing || moto.vendida || moto.fotos.length === 0) {
    return NextResponse.json(
      {
        error:
          "La moto no es publicable (inactiva para marketing, vendida o sin fotos).",
      },
      { status: 400 }
    )
  }

  const MIN_LEAD_MS = 5 * 60 * 1000
  const ahora = Date.now()
  const OVERLAP_MS = 4 * 60 * 60 * 1000

  const creados: { id: string; scheduledAt: Date }[] = []
  const saltados: { fecha: Date; motivo: string }[] = []

  for (const fecha of data.fechas) {
    if (fecha.getTime() < ahora + MIN_LEAD_MS) {
      saltados.push({ fecha, motivo: "Fecha muy próxima (< 5 min)" })
      continue
    }
    const overlap = await prisma.scheduledPost.findFirst({
      where: {
        motoId: data.motoId,
        status: { in: ["PENDING", "PROCESSING"] },
        scheduledAt: {
          gte: new Date(fecha.getTime() - OVERLAP_MS),
          lte: new Date(fecha.getTime() + OVERLAP_MS),
        },
      },
      select: { id: true },
    })
    if (overlap) {
      saltados.push({ fecha, motivo: "Ya hay un post de esta moto cerca" })
      continue
    }
    const post = await prisma.scheduledPost.create({
      data: {
        motoId: data.motoId,
        platforms: data.platforms,
        scheduledAt: fecha,
        customCaption: data.customCaption || null,
        status: "PENDING",
        createdById: (session as { id?: string }).id || null,
      },
      select: { id: true, scheduledAt: true },
    })
    creados.push(post)
  }

  return NextResponse.json(
    {
      creados: creados.length,
      saltados: saltados.length,
      detalleCreados: creados,
      detalleSaltados: saltados,
    },
    { status: 201 }
  )
}

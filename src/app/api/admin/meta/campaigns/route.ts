import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { campaignCreateSchema, CAMPAIGN_STATUSES } from "@/lib/meta/ads"
import type { Prisma } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/meta/campaigns
 * Lista todas las campañas + moto asociada + insights cacheados.
 * Filtros opcionales: status, motoId.
 */
export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const statusParam = url.searchParams.get("status")
  const motoId = url.searchParams.get("motoId")

  const where: Prisma.AdCampaignWhereInput = {}
  if (statusParam && (CAMPAIGN_STATUSES as readonly string[]).includes(statusParam)) {
    where.status = statusParam
  }
  if (motoId) where.motoId = motoId

  const campaigns = await prisma.adCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      moto: {
        select: { id: true, slug: true, marca: true, nombre: true, fotos: true },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ campaigns, count: campaigns.length })
}

/**
 * POST /api/admin/meta/campaigns
 * Crea AdCampaign en DRAFT (no se envía a Meta hasta /publish).
 * Validaciones del brief §8.2 (audiencia, presupuesto, etc.).
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = campaignCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data

  // Validaciones de negocio adicionales sobre la moto
  const moto = await prisma.modelo.findUnique({
    where: { id: data.motoId },
    select: {
      id: true,
      marca: true,
      nombre: true,
      anio: true,
      activeForMarketing: true,
      vendida: true,
      fotos: true,
    },
  })
  if (!moto) return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 })
  if (moto.vendida || !moto.activeForMarketing) {
    return NextResponse.json(
      { error: "La moto no está activa para marketing o está vendida." },
      { status: 400 }
    )
  }
  if (moto.fotos.length === 0) {
    return NextResponse.json(
      { error: "La moto no tiene fotos — al menos una para usar como creativo." },
      { status: 400 }
    )
  }

  // Validar presupuesto mínimo configurable
  const minBudget = Number(process.env.META_MIN_DAILY_BUDGET_ARS) || 1000
  const minCents = minBudget * 100
  if (data.dailyBudgetCents < minCents) {
    return NextResponse.json(
      {
        error: `Presupuesto diario muy bajo. Mínimo ARS ${minBudget.toLocaleString("es-AR")} ($${minCents} centavos).`,
      },
      { status: 400 }
    )
  }

  const name = `MF — ${moto.marca} ${moto.nombre}${moto.anio ? ` ${moto.anio}` : ""} — ${data.startDate.toISOString().slice(0, 10)}`

  const campaign = await prisma.adCampaign.create({
    data: {
      motoId: data.motoId,
      name,
      objective: data.objective,
      dailyBudgetCents: data.dailyBudgetCents,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "DRAFT",
      audienceConfig: data.audienceConfig as Prisma.InputJsonValue,
      creativeImageUrl: data.creativeImageUrl,
      creativeMediaType: data.creativeMediaType,
      creativeVideoUrl: data.creativeVideoUrl || null,
      creativeCaption: data.creativeCaption,
      creativeCallToAction: data.creativeCallToAction,
      destinationUrl: data.destinationUrl || null,
      createdById: (session as { id?: string }).id || null,
    },
    include: {
      moto: { select: { id: true, slug: true, marca: true, nombre: true } },
    },
  })

  return NextResponse.json({ campaign }, { status: 201 })
}

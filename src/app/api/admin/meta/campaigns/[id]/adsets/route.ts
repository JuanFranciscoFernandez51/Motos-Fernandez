import { NextResponse } from "next/server"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import {
  audienceConfigSchema,
  createAdSetInMeta,
  requireAdAccountId,
  CAMPAIGN_OBJECTIVES,
} from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/meta/campaigns/[id]/adsets
 *
 * Suma un AdSet nuevo a una campaña existente.
 *
 * Body: { name, dailyBudgetCents, startDate, endDate, audienceConfig }
 *
 * Flujo:
 * 1. Crea el AdSet en nuestra DB (status=DRAFT).
 * 2. Si la campaña padre ya está publicada en Meta (metaCampaignId
 *    existente), también crea el AdSet en Meta (PAUSED).
 * 3. Si la campaña es DRAFT, el AdSet queda solo en nuestra DB y se
 *    crea en Meta cuando se publique la campaña entera.
 */
const createSchema = z.object({
  name: z.string().min(1).max(120),
  dailyBudgetCents: z.number().int().positive().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  audienceConfig: audienceConfigSchema,
}).refine((d) => d.endDate > d.startDate, {
  message: "endDate debe ser posterior a startDate",
  path: ["endDate"],
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: campaignId } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true, metaCampaignId: true, objective: true },
  })
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })

  // Crear primero en DB (DRAFT)
  const adSet = await prisma.adCampaignAdSet.create({
    data: {
      campaignId: campaign.id,
      name: parsed.data.name,
      dailyBudgetCents: parsed.data.dailyBudgetCents,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: "DRAFT",
      audienceConfig: parsed.data.audienceConfig as Prisma.InputJsonValue,
      orden: await prisma.adCampaignAdSet.count({ where: { campaignId } }),
    },
  })

  // Si la campaña ya está en Meta, crear también el adset allá
  if (campaign.metaCampaignId && campaign.status !== "DRAFT") {
    if (!parsed.data.dailyBudgetCents) {
      return NextResponse.json(
        {
          error:
            "Para crear un AdSet en una campaña ya publicada hay que indicar presupuesto diario.",
        },
        { status: 400 }
      )
    }
    try {
      const adAccountId = await requireAdAccountId()
      const refs = await createAdSetInMeta({
        adAccountId,
        metaCampaignId: campaign.metaCampaignId,
        name: parsed.data.name,
        dailyBudgetCents: parsed.data.dailyBudgetCents,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        audience: parsed.data.audienceConfig,
        objective: campaign.objective as (typeof CAMPAIGN_OBJECTIVES)[number],
      })
      await prisma.adCampaignAdSet.update({
        where: { id: adSet.id },
        data: { metaAdSetId: refs.metaAdSetId, status: "IN_META_PAUSED" },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await prisma.adCampaignAdSet.update({
        where: { id: adSet.id },
        data: { status: "FAILED", errorMessage: msg.slice(0, 1000) },
      })
      return NextResponse.json(
        { error: `Creado en DB pero falló al subir a Meta: ${msg}` },
        { status: 502 }
      )
    }
  }

  return NextResponse.json({ adSet }, { status: 201 })
}

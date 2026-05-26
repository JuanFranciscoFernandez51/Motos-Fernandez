import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import {
  createCampaignInMeta,
  requireAdAccountId,
  type CampaignCreateInput,
  audienceConfigSchema,
} from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/meta/campaigns/[id]/publish
 * Empuja una campaña DRAFT a Meta. Crea Campaign + AdSet + Ad + Creative,
 * todo PAUSED. La activación final requiere otro click (/activate).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const c = await prisma.adCampaign.findUnique({
    where: { id },
    include: { moto: true },
  })
  if (!c) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  if (c.status !== "DRAFT") {
    return NextResponse.json(
      { error: `Solo se publican campañas DRAFT (esta está ${c.status})` },
      { status: 409 }
    )
  }

  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageId) {
    return NextResponse.json(
      { error: "No hay pageId configurado. Reconectá Meta." },
      { status: 400 }
    )
  }

  let adAccountId: string
  try {
    adAccountId = await requireAdAccountId()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sin ad account" },
      { status: 400 }
    )
  }

  // Reconstruimos el input de creación para reusar createCampaignInMeta
  const audienceParsed = audienceConfigSchema.safeParse(c.audienceConfig)
  if (!audienceParsed.success) {
    return NextResponse.json(
      { error: "audienceConfig guardado es inválido — recreá la campaña" },
      { status: 500 }
    )
  }
  const data: CampaignCreateInput = {
    motoId: c.motoId,
    objective: c.objective as CampaignCreateInput["objective"],
    dailyBudgetCents: c.dailyBudgetCents,
    startDate: c.startDate,
    endDate: c.endDate,
    audienceConfig: audienceParsed.data,
    creativeImageUrl: c.creativeImageUrl,
    creativeCaption: c.creativeCaption,
    creativeCallToAction:
      c.creativeCallToAction as CampaignCreateInput["creativeCallToAction"],
    destinationUrl: c.destinationUrl,
  }
  const motoLabel = `${c.moto.marca} ${c.moto.nombre}${c.moto.anio ? ` ${c.moto.anio}` : ""}`

  try {
    const refs = await createCampaignInMeta(
      data,
      cfg.pageId,
      cfg.igUserId,
      adAccountId,
      motoLabel
    )
    const updated = await prisma.adCampaign.update({
      where: { id },
      data: {
        status: "IN_META_PAUSED",
        metaCampaignId: refs.campaignId,
        metaAdSetId: refs.adSetId,
        metaAdId: refs.adId,
        metaCreativeId: refs.creativeId,
        errorMessage: null,
        errorCode: null,
      },
    })
    return NextResponse.json({ ok: true, campaign: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.adCampaign.update({
      where: { id },
      data: { status: "FAILED", errorMessage: msg.slice(0, 1000) },
    })
    return NextResponse.json(
      { error: `Falló al crear en Meta: ${msg}` },
      { status: 500 }
    )
  }
}

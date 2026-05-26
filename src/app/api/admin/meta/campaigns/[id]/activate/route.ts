import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { updateMetaStatus } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/meta/campaigns/[id]/activate
 * Activa una campaña que ya fue publicada en Meta (IN_META_PAUSED →
 * ACTIVE). Requiere body con { confirm: true } para evitar activación
 * accidental — el brief insiste en doble check.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body?.confirm !== true) {
    return NextResponse.json(
      {
        error:
          "Se requiere confirmación explícita. Body debe incluir { confirm: true }.",
      },
      { status: 400 }
    )
  }

  const { id } = await params
  const c = await prisma.adCampaign.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  if (!c.metaCampaignId) {
    return NextResponse.json(
      { error: "Esta campaña todavía no fue publicada a Meta (sin metaCampaignId)" },
      { status: 409 }
    )
  }
  if (!["IN_META_PAUSED", "PAUSED_BY_USER", "PAUSED_BY_META"].includes(c.status)) {
    return NextResponse.json(
      { error: `No se puede activar desde el estado ${c.status}` },
      { status: 409 }
    )
  }

  try {
    // Activamos campaign + adset + ad. Meta requiere los 3 ACTIVE para
    // que efectivamente corra.
    await updateMetaStatus(c.metaCampaignId, "ACTIVE")
    if (c.metaAdSetId) await updateMetaStatus(c.metaAdSetId, "ACTIVE")
    if (c.metaAdId) await updateMetaStatus(c.metaAdId, "ACTIVE")

    const updated = await prisma.adCampaign.update({
      where: { id },
      data: { status: "ACTIVE", errorMessage: null },
    })
    return NextResponse.json({ ok: true, campaign: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: `No pude activar en Meta: ${msg}` },
      { status: 500 }
    )
  }
}

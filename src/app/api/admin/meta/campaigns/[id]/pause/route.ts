import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { updateMetaStatus } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/meta/campaigns/[id]/pause
 * Pausa una campaña ACTIVE. Setea status local a PAUSED_BY_USER.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const c = await prisma.adCampaign.findUnique({ where: { id } })
  if (!c) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  if (!c.metaCampaignId) {
    return NextResponse.json({ error: "No publicada en Meta" }, { status: 409 })
  }

  try {
    await updateMetaStatus(c.metaCampaignId, "PAUSED")
    const updated = await prisma.adCampaign.update({
      where: { id },
      data: { status: "PAUSED_BY_USER" },
    })
    return NextResponse.json({ ok: true, campaign: updated })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

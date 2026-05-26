import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { fetchCampaignInsights } from "@/lib/meta/ads"
import type { Prisma } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/meta/campaigns/[id]/sync
 * Refresca insightsCache desde Meta manualmente (botón "Sincronizar"
 * en la UI de detalle). El cron sync-ad-insights hace lo mismo cada 6h
 * automáticamente.
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
    return NextResponse.json(
      { error: "Campaña sin metaCampaignId — todavía no fue publicada" },
      { status: 409 }
    )
  }

  const insights = await fetchCampaignInsights(c.metaCampaignId)
  if (!insights) {
    return NextResponse.json(
      { error: "Meta no devolvió insights (la campaña puede no haber tenido impresiones todavía)" },
      { status: 502 }
    )
  }

  const updated = await prisma.adCampaign.update({
    where: { id },
    data: {
      insightsCache: insights as unknown as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, insights, campaign: updated })
}

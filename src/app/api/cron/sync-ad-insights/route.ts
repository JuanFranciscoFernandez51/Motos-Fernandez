import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { fetchCampaignInsights } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Cron sync-ad-insights — cada 6 horas (vercel.json).
 *
 * Para cada AdCampaign en estado ACTIVE / IN_META_PAUSED / PAUSED_BY_*
 * que tenga metaCampaignId, trae los insights desde Meta y los cachea
 * en insightsCache. La UI usa el caché — no llama a Meta en cada render.
 *
 * También marca COMPLETED las campañas cuyo endDate ya pasó (en el
 * brief es un cron separado pero acá lo hacemos junto para no duplicar
 * crons en Vercel — Pro tiene cupo pero igual menos crons = menos cosas
 * que puedan romperse).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (process.env.FEATURE_META_ADS_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "FEATURE_META_ADS_ENABLED no está en 'true'",
    })
  }

  const ahora = new Date()
  const result = {
    insightsSynced: 0,
    insightsFailed: 0,
    completedMarked: 0,
    details: [] as Array<Record<string, unknown>>,
  }

  // 1) Marcar COMPLETED las campañas que ya pasaron su endDate
  const completedRes = await prisma.adCampaign.updateMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED_BY_USER", "PAUSED_BY_META"] },
      endDate: { lt: ahora },
    },
    data: { status: "COMPLETED" },
  })
  result.completedMarked = completedRes.count

  // 2) Sync de insights de las que siguen activas (o pausadas — el
  //    historial de gasto sigue siendo útil aunque esté pausada)
  const candidatas = await prisma.adCampaign.findMany({
    where: {
      metaCampaignId: { not: null },
      status: { in: ["ACTIVE", "PAUSED_BY_USER", "PAUSED_BY_META", "COMPLETED"] },
    },
    select: { id: true, metaCampaignId: true },
    take: 50,
  })

  for (const c of candidatas) {
    if (!c.metaCampaignId) continue
    try {
      const insights = await fetchCampaignInsights(c.metaCampaignId)
      if (!insights) {
        result.insightsFailed++
        result.details.push({ id: c.id, ok: false, reason: "no_data" })
        continue
      }
      await prisma.adCampaign.update({
        where: { id: c.id },
        data: {
          insightsCache: insights as unknown as Prisma.InputJsonValue,
          lastSyncedAt: ahora,
        },
      })
      result.insightsSynced++
    } catch (e) {
      result.insightsFailed++
      result.details.push({
        id: c.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // 3) Sync de insights por AdSet y Ad — para A/B testing comparativo.
  //    Solo de los items que están en Meta (con metaXxxId).
  const adSets = await prisma.adCampaignAdSet.findMany({
    where: {
      metaAdSetId: { not: null },
      status: { in: ["ACTIVE", "PAUSED_BY_USER", "COMPLETED"] },
    },
    select: { id: true, metaAdSetId: true },
    take: 100,
  })
  for (const s of adSets) {
    if (!s.metaAdSetId) continue
    try {
      const insights = await fetchCampaignInsights(s.metaAdSetId)
      if (insights) {
        await prisma.adCampaignAdSet.update({
          where: { id: s.id },
          data: {
            insightsCache: insights as unknown as Prisma.InputJsonValue,
            lastSyncedAt: ahora,
          },
        })
      }
    } catch {
      // best-effort: si falla un adset, seguimos con los demás
    }
  }

  const ads = await prisma.adCampaignAd.findMany({
    where: {
      metaAdId: { not: null },
      status: { in: ["ACTIVE", "PAUSED_BY_USER", "COMPLETED"] },
    },
    select: { id: true, metaAdId: true },
    take: 200,
  })
  for (const a of ads) {
    if (!a.metaAdId) continue
    try {
      const insights = await fetchCampaignInsights(a.metaAdId)
      if (insights) {
        await prisma.adCampaignAd.update({
          where: { id: a.id },
          data: {
            insightsCache: insights as unknown as Prisma.InputJsonValue,
            lastSyncedAt: ahora,
          },
        })
      }
    } catch {
      // idem
    }
  }

  return NextResponse.json({ ok: true, ...result })
}

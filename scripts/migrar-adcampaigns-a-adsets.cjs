#!/usr/bin/env node
/**
 * Migración (idempotente) de AdCampaign legacy → estructura jerárquica
 * AdCampaign → AdSet → Ad.
 *
 * Cada campaña vieja (1:1:1) genera:
 *   - 1 AdCampaignAdSet con los datos de audiencia/presupuesto y el
 *     metaAdSetId que ya estaba en la campaña.
 *   - 1 AdCampaignAd con el creative (mediaType=PHOTO porque la versión
 *     vieja solo soportaba imagen) y los metaAdId/metaCreativeId.
 *
 * Es seguro correrla múltiples veces — si la campaña ya tiene adSets[],
 * salta. No crea duplicados.
 *
 * Uso: node scripts/migrar-adcampaigns-a-adsets.cjs
 */

require("dotenv").config({ path: ".env.local" })
const { PrismaClient } = require("@prisma/client")

async function main() {
  const prisma = new PrismaClient()
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { status: { not: "DELETED" } },
      include: { adSets: { select: { id: true } } },
    })

    let migradas = 0
    let salteadas = 0

    for (const c of campaigns) {
      if (c.adSets.length > 0) {
        salteadas++
        console.log(`⏭  ${c.name.slice(0, 50)} — ya tiene ${c.adSets.length} adset(s)`)
        continue
      }

      const adSet = await prisma.adCampaignAdSet.create({
        data: {
          campaignId: c.id,
          name: `${c.name} - AdSet 1`,
          metaAdSetId: c.metaAdSetId,
          dailyBudgetCents: c.dailyBudgetCents,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status,
          audienceConfig: c.audienceConfig,
          insightsCache: c.insightsCache,
          lastSyncedAt: c.lastSyncedAt,
          errorMessage: c.errorMessage,
          errorCode: c.errorCode,
          orden: 0,
        },
      })

      await prisma.adCampaignAd.create({
        data: {
          adSetId: adSet.id,
          name: `${c.name} - Ad 1`,
          metaAdId: c.metaAdId,
          metaCreativeId: c.metaCreativeId,
          status: c.status,
          // Las campañas viejas solo soportaban PHOTO single (no carrusel,
          // no video). Si más adelante editamos para usar carrusel o video,
          // el editor lo va a marcar como PHOTO_CAROUSEL/VIDEO/REEL.
          mediaType: "PHOTO",
          imageUrls: [c.creativeImageUrl],
          videoUrls: [],
          caption: c.creativeCaption,
          callToAction: c.creativeCallToAction,
          destinationUrl: c.destinationUrl,
          insightsCache: c.insightsCache, // mismo cache que el adset por ahora
          lastSyncedAt: c.lastSyncedAt,
          orden: 0,
        },
      })

      migradas++
      console.log(`✅ ${c.name.slice(0, 50)} → 1 AdSet + 1 Ad`)
    }

    console.log(`\nMigradas: ${migradas} · Salteadas: ${salteadas}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})

import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSection } from "@/lib/admin-auth"
import { CampaignDetailClient } from "./detail-client"

export const dynamic = "force-dynamic"

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSection("META_ADS")
  if (!session) redirect("/admin")

  const { id } = await params
  const campaign = await prisma.adCampaign.findUnique({
    where: { id },
    include: {
      moto: {
        select: { id: true, slug: true, marca: true, nombre: true, fotos: true },
      },
      adSets: {
        where: { status: { not: "DELETED" } },
        orderBy: { orden: "asc" },
        include: {
          ads: {
            where: { status: { not: "DELETED" } },
            orderBy: { orden: "asc" },
          },
        },
      },
    },
  })
  if (!campaign) notFound()

  // Para el form de "Nuevo Ad": el admin puede usar las fotos del modelo
  // como base. Le pasamos el array.
  const fotosMoto = campaign.moto.fotos

  return (
    <CampaignDetailClient
      campaign={{
        id: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        dailyBudgetCents: campaign.dailyBudgetCents,
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate.toISOString(),
        metaCampaignId: campaign.metaCampaignId,
        errorMessage: campaign.errorMessage,
        insightsCache: campaign.insightsCache as Record<string, unknown> | null,
        moto: {
          id: campaign.moto.id,
          slug: campaign.moto.slug,
          marca: campaign.moto.marca,
          nombre: campaign.moto.nombre,
          fotoPrincipal: campaign.moto.fotos[0] || null,
        },
        adSets: campaign.adSets.map((s) => ({
          id: s.id,
          name: s.name,
          metaAdSetId: s.metaAdSetId,
          status: s.status,
          dailyBudgetCents: s.dailyBudgetCents,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
          audienceConfig: s.audienceConfig as Record<string, unknown>,
          insightsCache: s.insightsCache as Record<string, unknown> | null,
          errorMessage: s.errorMessage,
          ads: s.ads.map((a) => ({
            id: a.id,
            name: a.name,
            metaAdId: a.metaAdId,
            status: a.status,
            mediaType: a.mediaType,
            imageUrls: a.imageUrls,
            videoUrls: a.videoUrls,
            caption: a.caption,
            callToAction: a.callToAction,
            destinationUrl: a.destinationUrl,
            insightsCache: a.insightsCache as Record<string, unknown> | null,
            errorMessage: a.errorMessage,
          })),
        })),
      }}
      fotosMoto={fotosMoto}
    />
  )
}

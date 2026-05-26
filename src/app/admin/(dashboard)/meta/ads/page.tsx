import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSection } from "@/lib/admin-auth"
import { AdsClient } from "./ads-client"

export const dynamic = "force-dynamic"

export default async function MetaAdsPage() {
  const session = await requireSection("META")
  if (!session) redirect("/admin")

  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  const featureEnabled = process.env.FEATURE_META_ADS_ENABLED === "true"
  const minBudget = Number(process.env.META_MIN_DAILY_BUDGET_ARS) || 1000

  const motos = cfg?.adAccountId
    ? await prisma.modelo.findMany({
        where: {
          activeForMarketing: true,
          vendida: false,
          fotos: { isEmpty: false },
        },
        orderBy: [{ marca: "asc" }, { nombre: "asc" }],
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          anio: true,
          condicion: true,
          precio: true,
          moneda: true,
          fotos: true,
        },
      })
    : []

  const campaigns = await prisma.adCampaign.findMany({
    where: { status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    include: {
      moto: {
        select: { id: true, slug: true, marca: true, nombre: true, fotos: true },
      },
    },
  })

  return (
    <AdsClient
      featureEnabled={featureEnabled}
      adAccountId={cfg?.adAccountId || null}
      minBudget={minBudget}
      motos={motos.map((m) => ({
        id: m.id,
        slug: m.slug,
        marca: m.marca,
        nombre: m.nombre,
        anio: m.anio,
        condicion: m.condicion || "0KM",
        precio: m.precio,
        moneda: m.moneda,
        fotoPrincipal: m.fotos[0] || null,
        fotos: m.fotos,
      }))}
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        dailyBudgetCents: c.dailyBudgetCents,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        insightsCache: c.insightsCache as Record<string, unknown> | null,
        errorMessage: c.errorMessage,
        moto: {
          id: c.moto.id,
          slug: c.moto.slug,
          marca: c.moto.marca,
          nombre: c.moto.nombre,
          fotoPrincipal: c.moto.fotos[0] || null,
        },
      }))}
    />
  )
}

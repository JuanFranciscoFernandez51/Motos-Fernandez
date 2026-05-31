import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { decryptToken } from "@/lib/crypto/tokens"
import { metaGet, metaPost } from "@/lib/meta/client"

/**
 * Helpers + tipos compartidos para Meta Marketing API.
 *
 * Estructura interna de una "campaña" en Meta:
 *   Campaign (objetivo + presupuesto opcional) →
 *     AdSet (audiencia + presupuesto + schedule) →
 *       Ad (creative + destination)
 *
 * Nosotros simplificamos: 1 AdCampaign = 1 Campaign + 1 AdSet + 1 Ad
 * (no manejamos múltiples adsets por campaña). El admin no necesita la
 * granularidad de Ads Manager para los casos típicos de Motos Fernandez.
 */

// ===== ENUMS / CONSTANTES =====

export const CAMPAIGN_STATUSES = [
  "DRAFT",            // creada solo en nuestra DB
  "IN_META_PAUSED",   // creada en Meta, pausada
  "ACTIVE",
  "PAUSED_BY_USER",
  "PAUSED_BY_META",
  "COMPLETED",
  "FAILED",
  "DELETED",
] as const
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]

// Objetivos ODAX (la nomenclatura nueva de Meta). Los legacy
// (BRAND_AWARENESS, etc.) están deprecados desde 2024.
export const CAMPAIGN_OBJECTIVES = [
  "OUTCOME_TRAFFIC",     // visitas a la ficha de moto
  "OUTCOME_ENGAGEMENT",  // likes, comentarios, shares
  "OUTCOME_LEADS",       // formularios / WhatsApp
  "OUTCOME_AWARENESS",   // alcance / impresiones
] as const

export const OBJECTIVE_LABELS: Record<(typeof CAMPAIGN_OBJECTIVES)[number], string> = {
  OUTCOME_TRAFFIC: "Tráfico (llevar a la ficha de la moto)",
  OUTCOME_ENGAGEMENT: "Interacción (likes, comentarios)",
  OUTCOME_LEADS: "Mensajes / Leads (WhatsApp)",
  OUTCOME_AWARENESS: "Alcance / reconocimiento",
}

export const CTAS = [
  "LEARN_MORE",
  "MESSAGE_PAGE",
  "WHATSAPP_MESSAGE",
  "GET_DIRECTIONS",
  "SHOP_NOW",
  "CONTACT_US",
  "APPLY_NOW",
] as const

// ===== SCHEMAS ZOD =====

/**
 * Configuración de audiencia. Validamos en POST antes de mandar a Meta
 * porque Meta a veces devuelve errores crípticos para inputs inválidos.
 */
export const audienceConfigSchema = z.object({
  ageMin: z.number().int().min(13).max(65).default(18),
  ageMax: z.number().int().min(13).max(65).default(55),
  genders: z.array(z.enum(["male", "female", "all"])).default(["all"]),
  // Ubicaciones: por ahora soportamos países + ciudades por id de Meta.
  // El frontend va a usar el endpoint search/targeting para resolverlas.
  locations: z
    .object({
      countries: z.array(z.string()).default(["AR"]),
      cities: z
        .array(
          z.object({
            key: z.string(), // id Meta de la ciudad
            name: z.string(),
            radius: z.number().int().min(1).max(80).default(40), // km
          })
        )
        .default([]),
    })
    .default({ countries: ["AR"], cities: [] }),
  interests: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .default([]),
  languages: z.array(z.string()).default([]), // códigos ISO ej "es"
})

export type AudienceConfig = z.infer<typeof audienceConfigSchema>

export const campaignCreateSchema = z.object({
  motoId: z.string().min(1),
  objective: z.enum(CAMPAIGN_OBJECTIVES),
  dailyBudgetCents: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  audienceConfig: audienceConfigSchema,
  creativeImageUrl: z.string().url(),
  creativeMediaType: z.enum(["PHOTO", "VIDEO", "REEL"]).default("PHOTO"),
  creativeVideoUrl: z.string().url().optional().nullable(),
  creativeCaption: z.string().min(1).max(2200),
  creativeCallToAction: z.enum(CTAS),
  destinationUrl: z.string().url().optional().nullable(),
}).refine(
  (d) =>
    d.creativeMediaType === "PHOTO" ||
    (!!d.creativeVideoUrl && d.creativeVideoUrl.length > 0),
  { message: "VIDEO/REEL requieren creativeVideoUrl", path: ["creativeVideoUrl"] }
).refine((d) => d.endDate > d.startDate, {
  message: "endDate debe ser posterior a startDate",
  path: ["endDate"],
}).refine(
  (d) => d.endDate.getTime() - d.startDate.getTime() >= 24 * 60 * 60 * 1000,
  { message: "La campaña debe durar al menos 24 horas", path: ["endDate"] }
).refine(
  (d) => d.audienceConfig.ageMax >= d.audienceConfig.ageMin,
  { message: "ageMax debe ser ≥ ageMin", path: ["audienceConfig", "ageMax"] }
)

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>

// ===== HELPERS DE META MARKETING API =====

/**
 * Devuelve las ad accounts a las que tiene acceso el user del token
 * actual. Lo usa el wizard de setup para que Francisco elija cuál
 * conectar (probablemente "Motos Fernandez Ads", o similar).
 */
export type AdAccountInfo = {
  id: string             // formato "act_XXXXX"
  account_id: string     // id sin el prefijo "act_"
  name: string
  currency: string
  account_status: number // 1=ACTIVE, otros=problemas
  business?: { id: string; name: string }
}

export async function listAdAccounts(): Promise<AdAccountInfo[]> {
  // /me/adaccounts devuelve solo las que el user puede manejar.
  const r = await metaGet<{ data: AdAccountInfo[] }>(
    "/me/adaccounts?fields=id,account_id,name,currency,account_status,business{id,name}&limit=50"
  )
  return r.data || []
}

/**
 * Info detallada del ad account guardado en MetaConfig. Sirve para el
 * dashboard (mostrar saldo, moneda, estado).
 */
export async function getAdAccountInfo(): Promise<AdAccountInfo | null> {
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.adAccountId) return null
  try {
    return await metaGet<AdAccountInfo>(
      `/${cfg.adAccountId}?fields=id,account_id,name,currency,account_status,business{id,name}`
    )
  } catch {
    return null
  }
}

/**
 * Search del catálogo de targeting (intereses, comportamientos, etc.).
 * Lo consume el AudienceBuilder con debounce.
 */
export type TargetingSuggestion = {
  id: string
  name: string
  audience_size_lower_bound?: number
  audience_size_upper_bound?: number
  type?: string
  path?: string[]
}

export async function searchTargeting(
  query: string
): Promise<TargetingSuggestion[]> {
  if (!query.trim()) return []
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.adAccountId) return []
  const url = `/search?type=adinterest&q=${encodeURIComponent(query)}&limit=20`
  const r = await metaGet<{ data: TargetingSuggestion[] }>(url)
  return r.data || []
}

// ===== TARGETING SPEC: convierte nuestra AudienceConfig a lo que Meta espera =====

/**
 * Adapta nuestra AudienceConfig al "targeting spec" de Meta. Meta tiene
 * una estructura JSON específica con keys tipo `geo_locations`,
 * `interests`, etc.
 *
 * advantage_audience: Meta v25+ exige declararlo explícito (0=off, 1=on).
 * Lo dejamos en 0 para que el targeting respete EXACTAMENTE lo que el
 * admin eligió. Si queremos que Meta amplíe el público automáticamente
 * para optimizar, lo cambiamos a 1.
 */
export function audienceConfigToTargetingSpec(
  a: AudienceConfig
): Record<string, unknown> {
  const spec: Record<string, unknown> = {
    age_min: a.ageMin,
    age_max: a.ageMax,
    targeting_automation: { advantage_audience: 0 },
  }
  // Genders: Meta espera [1] male, [2] female, [1,2] all
  if (!a.genders.includes("all")) {
    const g: number[] = []
    if (a.genders.includes("male")) g.push(1)
    if (a.genders.includes("female")) g.push(2)
    spec.genders = g
  }
  // Geo
  const geo: Record<string, unknown> = {}
  if (a.locations.countries.length > 0) {
    geo.countries = a.locations.countries
  }
  if (a.locations.cities.length > 0) {
    geo.cities = a.locations.cities.map((c) => ({
      key: c.key,
      radius: c.radius,
      distance_unit: "kilometer",
    }))
  }
  if (Object.keys(geo).length > 0) {
    spec.geo_locations = geo
  }
  // Intereses
  if (a.interests.length > 0) {
    spec.flexible_spec = [
      { interests: a.interests.map((i) => ({ id: i.id, name: i.name })) },
    ]
  }
  // Idiomas (códigos de Meta — para AR no haría falta filtrar, pero queda)
  if (a.languages.length > 0) {
    spec.locales = a.languages
  }
  return spec
}

// ===== CREAR EN META: Campaign → AdSet → Ad =====

/**
 * Crea Campaign + AdSet + Ad en Meta tras pasar a IN_META_PAUSED.
 * Devuelve los IDs para guardarlos en AdCampaign.metaCampaignId, etc.
 *
 * Status inicial en Meta: PAUSED. La activación se hace en otro endpoint
 * (con doble check del admin).
 */
export type MetaCampaignCreated = {
  campaignId: string
  adSetId: string
  adId: string
  creativeId: string
}

export async function createCampaignInMeta(
  data: CampaignCreateInput,
  pageId: string,
  igUserId: string | null,
  adAccountId: string,
  motoLabel: string
): Promise<MetaCampaignCreated> {
  // 1) Campaign
  //
  // Detalles que aprendimos a la fuerza:
  // - special_ad_categories tiene que ser ["NONE"] explícito en
  //   accounts nuevas, no array vacío (Meta da 100/4834011 si no).
  // - buying_type debería defaultear a AUCTION pero algunas ad accounts
  //   lo requieren explícito.
  // - El objective tiene que venir como string (ej "OUTCOME_TRAFFIC").
  //   En ad accounts viejas todavía hay que mandar el legacy
  //   ("LINK_CLICKS") — Meta migró los nuevos en julio 2023.
  const campaignName = `MF — ${motoLabel} — ${data.startDate.toISOString().slice(0, 10)}`
  const campaign = await metaPost<{ id: string }>(
    `/${adAccountId}/campaigns`,
    {
      name: campaignName,
      objective: data.objective,
      status: "PAUSED",
      special_ad_categories: ["NONE"],
      buying_type: "AUCTION",
      // Meta v25+ exige esta flag explícita cuando NO usamos Campaign
      // Budget Optimization (CBO) — el presupuesto vive en el adset, no
      // en la campaña. false = los adsets no comparten budget entre sí.
      is_adset_budget_sharing_enabled: false,
    }
  )

  // 2) Ad Set
  //
  // bid_strategy: cuando no especificás una, Meta v25+ exige bid_amount
  // o constraints. LOWEST_COST_WITHOUT_CAP es la "automatic bid"
  // histórica — Meta optimiza solo, sin tope manual. Es la opción más
  // simple y la que el admin típicamente quiere para una primera campaña.
  const targeting = audienceConfigToTargetingSpec(data.audienceConfig)
  const adSet = await metaPost<{ id: string }>(
    `/${adAccountId}/adsets`,
    {
      name: `${campaignName} - AdSet`,
      campaign_id: campaign.id,
      daily_budget: data.dailyBudgetCents, // Meta espera centavos
      billing_event: "IMPRESSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      optimization_goal:
        data.objective === "OUTCOME_TRAFFIC"
          ? "LINK_CLICKS"
          : data.objective === "OUTCOME_LEADS"
            ? "OFFSITE_CONVERSIONS"
            : data.objective === "OUTCOME_ENGAGEMENT"
              ? "POST_ENGAGEMENT"
              : "REACH",
      start_time: data.startDate.toISOString(),
      end_time: data.endDate.toISOString(),
      targeting,
      status: "PAUSED",
    }
  )

  // 3) Creative
  //
  // instagram_user_id (v25+) reemplaza al legacy instagram_actor_id.
  // Soporta foto (link_data) o video/reel (video_data, subiendo el video
  // a /advideos primero para obtener video_id).
  const linkBase =
    data.destinationUrl || "https://www.motosfernandez.com.ar"
  let objectStorySpec: Record<string, unknown>
  if (
    (data.creativeMediaType === "VIDEO" || data.creativeMediaType === "REEL") &&
    data.creativeVideoUrl
  ) {
    const video = await metaPost<{ id: string }>(`/${adAccountId}/advideos`, {
      file_url: data.creativeVideoUrl,
    })
    objectStorySpec = {
      page_id: pageId,
      ...(igUserId ? { instagram_user_id: igUserId } : {}),
      video_data: {
        video_id: video.id,
        message: data.creativeCaption,
        // Para video, Meta requiere image_url como thumbnail (usamos la
        // foto principal de la moto como cover).
        image_url: data.creativeImageUrl,
        call_to_action: {
          type: data.creativeCallToAction,
          value: { link: linkBase },
        },
      },
    }
  } else {
    objectStorySpec = {
      page_id: pageId,
      ...(igUserId ? { instagram_user_id: igUserId } : {}),
      link_data: {
        link: linkBase,
        message: data.creativeCaption,
        picture: data.creativeImageUrl,
        call_to_action: { type: data.creativeCallToAction },
      },
    }
  }
  const creative = await metaPost<{ id: string }>(
    `/${adAccountId}/adcreatives`,
    { name: `${campaignName} - Creative`, object_story_spec: objectStorySpec }
  )

  // 4) Ad
  const ad = await metaPost<{ id: string }>(`/${adAccountId}/ads`, {
    name: `${campaignName} - Ad`,
    adset_id: adSet.id,
    creative: { creative_id: creative.id },
    status: "PAUSED",
  })

  return {
    campaignId: campaign.id,
    adSetId: adSet.id,
    adId: ad.id,
    creativeId: creative.id,
  }
}

/** Cambia status de un objeto en Meta (campaign / adset / ad). */
export async function updateMetaStatus(
  objectId: string,
  status: "ACTIVE" | "PAUSED" | "DELETED"
): Promise<void> {
  await metaPost(`/${objectId}`, { status })
}

// ===== HELPERS PARA ESTRUCTURA JERÁRQUICA (Fase 7) =====
//
// La función createCampaignInMeta de arriba sigue siendo válida para
// el flujo "1 click → 1 campaign + 1 adset + 1 ad" desde el wizard
// simple. Las funciones de abajo permiten crear AdSets y Ads
// individuales para el editor avanzado.

export type AdMediaInput =
  | { type: "PHOTO"; imageUrl: string }
  | { type: "PHOTO_CAROUSEL"; imageUrls: string[] }
  | { type: "VIDEO" | "REEL"; videoUrl: string }

/**
 * Crea SOLO un AdSet bajo una campaña existente. Útil para sumar
 * conjuntos nuevos a una campaign que ya está en Meta (A/B testing
 * de audiencias).
 *
 * El campaign tiene que estar ya en Meta (con metaCampaignId). El
 * nuevo adset se crea PAUSED — activar es un paso separado.
 */
export async function createAdSetInMeta(args: {
  adAccountId: string
  metaCampaignId: string
  name: string
  dailyBudgetCents: number
  startDate: Date
  endDate: Date
  audience: AudienceConfig
  /** Objetivo de la campaña — define optimization_goal del adset. */
  objective: (typeof CAMPAIGN_OBJECTIVES)[number]
}): Promise<{ metaAdSetId: string }> {
  const targeting = audienceConfigToTargetingSpec(args.audience)
  const adSet = await metaPost<{ id: string }>(
    `/${args.adAccountId}/adsets`,
    {
      name: args.name,
      campaign_id: args.metaCampaignId,
      daily_budget: args.dailyBudgetCents,
      billing_event: "IMPRESSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      optimization_goal:
        args.objective === "OUTCOME_TRAFFIC"
          ? "LINK_CLICKS"
          : args.objective === "OUTCOME_LEADS"
            ? "OFFSITE_CONVERSIONS"
            : args.objective === "OUTCOME_ENGAGEMENT"
              ? "POST_ENGAGEMENT"
              : "REACH",
      start_time: args.startDate.toISOString(),
      end_time: args.endDate.toISOString(),
      targeting,
      status: "PAUSED",
    }
  )
  return { metaAdSetId: adSet.id }
}

/**
 * Crea un Ad (con creative) bajo un AdSet existente.
 *
 * Soporta los 4 tipos de media:
 * - PHOTO: imagen fija (link_data con picture).
 * - PHOTO_CAROUSEL: 2-10 imágenes (link_data con child_attachments).
 * - VIDEO: video al feed (video_data con video_id).
 * - REEL: video vertical 9:16 (mismo video_data pero con placement reel).
 *
 * Para VIDEO/REEL Meta necesita primero subir el video al ad account
 * y obtener un video_id. Esa subida la hacemos con /act/{id}/advideos.
 */
export async function createAdInMeta(args: {
  adAccountId: string
  pageId: string
  igUserId: string | null
  metaAdSetId: string
  name: string
  media: AdMediaInput
  caption: string
  callToAction: (typeof CTAS)[number]
  destinationUrl?: string | null
}): Promise<{ metaAdId: string; metaCreativeId: string }> {
  const linkBase = args.destinationUrl || "https://www.motosfernandez.com.ar"

  let objectStorySpec: Record<string, unknown>

  if (args.media.type === "PHOTO") {
    objectStorySpec = {
      page_id: args.pageId,
      ...(args.igUserId ? { instagram_user_id: args.igUserId } : {}),
      link_data: {
        link: linkBase,
        message: args.caption,
        picture: args.media.imageUrl,
        call_to_action: { type: args.callToAction },
      },
    }
  } else if (args.media.type === "PHOTO_CAROUSEL") {
    objectStorySpec = {
      page_id: args.pageId,
      ...(args.igUserId ? { instagram_user_id: args.igUserId } : {}),
      link_data: {
        link: linkBase,
        message: args.caption,
        child_attachments: args.media.imageUrls.slice(0, 10).map((url) => ({
          link: linkBase,
          picture: url,
          call_to_action: { type: args.callToAction },
        })),
      },
    }
  } else {
    // VIDEO o REEL: hay que subir el video al ad account primero
    // para obtener video_id, y después referenciarlo en object_story_spec.
    const video = await metaPost<{ id: string }>(
      `/${args.adAccountId}/advideos`,
      { file_url: args.media.videoUrl }
    )
    objectStorySpec = {
      page_id: args.pageId,
      ...(args.igUserId ? { instagram_user_id: args.igUserId } : {}),
      video_data: {
        video_id: video.id,
        message: args.caption,
        call_to_action: {
          type: args.callToAction,
          value: { link: linkBase },
        },
      },
    }
  }

  const creative = await metaPost<{ id: string }>(
    `/${args.adAccountId}/adcreatives`,
    {
      name: `${args.name} - Creative`,
      object_story_spec: objectStorySpec,
    }
  )

  const ad = await metaPost<{ id: string }>(`/${args.adAccountId}/ads`, {
    name: args.name,
    adset_id: args.metaAdSetId,
    creative: { creative_id: creative.id },
    status: "PAUSED",
  })

  return { metaAdId: ad.id, metaCreativeId: creative.id }
}

/** Trae insights de un AdSet o Ad individual (no solo de Campaign). */
export async function fetchObjectInsights(
  objectId: string
): Promise<CampaignInsightsCache | null> {
  return fetchCampaignInsights(objectId) // Meta usa el mismo endpoint
}

// ===== INSIGHTS =====

/**
 * Trae insights agregados de una campaña Meta (toda la vida).
 * Estructura simplificada que cacheamos en AdCampaign.insightsCache.
 */
export type CampaignInsightsCache = {
  reach: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  cpc: number
  spend: number
  results: number
  costPerResult: number | null
  syncedAt: string
}

export async function fetchCampaignInsights(
  metaCampaignId: string
): Promise<CampaignInsightsCache | null> {
  const fields =
    "reach,impressions,clicks,ctr,cpm,cpc,spend,actions,cost_per_action_type"
  try {
    const r = await metaGet<{
      data?: Array<{
        reach?: string
        impressions?: string
        clicks?: string
        ctr?: string
        cpm?: string
        cpc?: string
        spend?: string
        actions?: Array<{ action_type: string; value: string }>
        cost_per_action_type?: Array<{ action_type: string; value: string }>
      }>
    }>(`/${metaCampaignId}/insights?fields=${fields}`)
    const row = r.data?.[0]
    if (!row) return null
    const n = (s: string | undefined) => (s ? Number(s) : 0)
    return {
      reach: n(row.reach),
      impressions: n(row.impressions),
      clicks: n(row.clicks),
      ctr: n(row.ctr),
      cpm: n(row.cpm),
      cpc: n(row.cpc),
      spend: n(row.spend),
      results: row.actions?.reduce((acc, a) => acc + n(a.value), 0) || 0,
      costPerResult:
        row.cost_per_action_type && row.cost_per_action_type.length > 0
          ? n(row.cost_per_action_type[0].value)
          : null,
      syncedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

// ===== UTIL =====

/**
 * Trae adAccountId del config y valida que esté seteado. Throw si no
 * está — los endpoints deciden cómo manejar.
 */
export async function requireAdAccountId(): Promise<string> {
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.adAccountId) {
    throw new Error(
      "No hay ad account configurado. Andá a /admin/meta/ads y elegí uno."
    )
  }
  return cfg.adAccountId
}

/** El page token decryptado — alias para usar en endpoints de ads. */
export async function getDecryptedPageToken(): Promise<string | null> {
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageAccessToken) return null
  return decryptToken(cfg.pageAccessToken)
}

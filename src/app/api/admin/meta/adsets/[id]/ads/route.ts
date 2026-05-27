import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import {
  createAdInMeta,
  requireAdAccountId,
  getDecryptedPageToken,
  CTAS,
  type AdMediaInput,
} from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/admin/meta/adsets/[id]/ads
 *
 * Suma un Ad nuevo a un AdSet existente.
 *
 * Body:
 *  - name: string
 *  - mediaType: "PHOTO" | "PHOTO_CAROUSEL" | "VIDEO" | "REEL"
 *  - imageUrls + videoUrls según mediaType
 *  - caption, callToAction, destinationUrl?
 *
 * Si el AdSet padre está en Meta (metaAdSetId existente), también crea
 * el Ad en Meta (PAUSED). Sino, queda solo en DB hasta que se publique.
 */
const createSchema = z
  .object({
    name: z.string().min(1).max(120),
    mediaType: z.enum(["PHOTO", "PHOTO_CAROUSEL", "VIDEO", "REEL"]),
    imageUrls: z.array(z.string().url()).default([]),
    videoUrls: z.array(z.string().url()).default([]),
    caption: z.string().min(1).max(2200),
    callToAction: z.enum(CTAS),
    destinationUrl: z.string().url().nullable().optional(),
  })
  .refine((d) => {
    if (d.mediaType === "PHOTO") return d.imageUrls.length === 1
    if (d.mediaType === "PHOTO_CAROUSEL")
      return d.imageUrls.length >= 2 && d.imageUrls.length <= 10
    return d.videoUrls.length === 1
  }, "Media inválida para el tipo elegido (PHOTO=1 imagen, CAROUSEL=2-10, VIDEO/REEL=1 video)")

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: adSetId } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adSet = await prisma.adCampaignAdSet.findUnique({
    where: { id: adSetId },
    select: { id: true, status: true, metaAdSetId: true },
  })
  if (!adSet) return NextResponse.json({ error: "AdSet no encontrado" }, { status: 404 })

  const ad = await prisma.adCampaignAd.create({
    data: {
      adSetId,
      name: parsed.data.name,
      mediaType: parsed.data.mediaType,
      imageUrls: parsed.data.imageUrls,
      videoUrls: parsed.data.videoUrls,
      caption: parsed.data.caption,
      callToAction: parsed.data.callToAction,
      destinationUrl: parsed.data.destinationUrl || null,
      status: "DRAFT",
      orden: await prisma.adCampaignAd.count({ where: { adSetId } }),
    },
  })

  if (adSet.metaAdSetId && adSet.status !== "DRAFT") {
    const token = await getDecryptedPageToken()
    if (!token) {
      return NextResponse.json(
        { error: "Meta no está conectado" },
        { status: 400 }
      )
    }
    try {
      const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
      if (!cfg?.pageId) throw new Error("Falta pageId en MetaConfig")
      const adAccountId = await requireAdAccountId()

      const media: AdMediaInput =
        parsed.data.mediaType === "PHOTO"
          ? { type: "PHOTO", imageUrl: parsed.data.imageUrls[0] }
          : parsed.data.mediaType === "PHOTO_CAROUSEL"
            ? { type: "PHOTO_CAROUSEL", imageUrls: parsed.data.imageUrls }
            : { type: parsed.data.mediaType, videoUrl: parsed.data.videoUrls[0] }

      const refs = await createAdInMeta({
        adAccountId,
        pageId: cfg.pageId,
        igUserId: cfg.igUserId,
        metaAdSetId: adSet.metaAdSetId,
        name: parsed.data.name,
        media,
        caption: parsed.data.caption,
        callToAction: parsed.data.callToAction,
        destinationUrl: parsed.data.destinationUrl,
      })

      await prisma.adCampaignAd.update({
        where: { id: ad.id },
        data: {
          metaAdId: refs.metaAdId,
          metaCreativeId: refs.metaCreativeId,
          status: "IN_META_PAUSED",
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await prisma.adCampaignAd.update({
        where: { id: ad.id },
        data: { status: "FAILED", errorMessage: msg.slice(0, 1000) },
      })
      return NextResponse.json(
        { error: `Creado en DB pero falló al subir a Meta: ${msg}` },
        { status: 502 }
      )
    }
  }

  return NextResponse.json({ ad }, { status: 201 })
}

import { NextResponse } from "next/server"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { updateMetaStatus, CTAS } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET / PATCH / DELETE /api/admin/meta/ads-items/[id]
 *
 * Endpoint a nivel Ad (creative individual). Naming "ads-items" para
 * no colisionar con /api/admin/meta/ads (la sección de campañas).
 *
 * PATCH: cambios al creative — caption, callToAction, destinationUrl.
 * Cambiar la media (imageUrls/videoUrls) requiere recrear el creative
 * en Meta, por ahora no lo permitimos en PATCH (solo via "duplicar
 * ad con cambios").
 *
 * DELETE: soft delete + pause en Meta.
 */
const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  caption: z.string().min(1).max(2200).optional(),
  callToAction: z.enum(CTAS).optional(),
  destinationUrl: z.string().url().nullable().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const ad = await prisma.adCampaignAd.findUnique({
    where: { id },
    include: { adSet: { include: { campaign: true } } },
  })
  if (!ad) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ ad })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const existente = await prisma.adCampaignAd.findUnique({ where: { id } })
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const data: Prisma.AdCampaignAdUpdateInput = {}
  if (parsed.data.name) data.name = parsed.data.name
  if (parsed.data.caption) data.caption = parsed.data.caption
  if (parsed.data.callToAction) data.callToAction = parsed.data.callToAction
  if (parsed.data.destinationUrl !== undefined) {
    data.destinationUrl = parsed.data.destinationUrl
  }

  const updated = await prisma.adCampaignAd.update({ where: { id }, data })

  // Nota: cambiar el creative en Meta (caption/CTA/link) NO se hace
  // editando el creative existente — Meta requiere crear uno nuevo y
  // reasignarlo al ad. Eso lo hacemos en una iteración futura ("re-
  // creative" desde la UI). Por ahora solo persistimos en DB y los
  // cambios viajan a Meta cuando se republique.
  return NextResponse.json({ ad: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const a = await prisma.adCampaignAd.findUnique({
    where: { id },
    select: { metaAdId: true, status: true },
  })
  if (!a) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (a.metaAdId && a.status === "ACTIVE") {
    try {
      await updateMetaStatus(a.metaAdId, "PAUSED")
    } catch (e) {
      console.warn("[ad] No pude pausar antes de eliminar:", e)
    }
  }
  await prisma.adCampaignAd.update({
    where: { id },
    data: { status: "DELETED" },
  })
  return NextResponse.json({ ok: true })
}

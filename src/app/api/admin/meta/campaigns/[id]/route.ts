import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { updateMetaStatus } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/meta/campaigns/[id]
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const campaign = await prisma.adCampaign.findUnique({
    where: { id },
    include: {
      moto: {
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          fotos: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json({ campaign })
}

/**
 * DELETE /api/admin/meta/campaigns/[id]
 * Soft delete + pausar en Meta si tenía IDs.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const c = await prisma.adCampaign.findUnique({
    where: { id },
    select: { metaCampaignId: true, status: true },
  })
  if (!c) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  // Si está corriendo en Meta, pausarla primero (best-effort)
  if (c.metaCampaignId && c.status === "ACTIVE") {
    try {
      await updateMetaStatus(c.metaCampaignId, "PAUSED")
    } catch (e) {
      console.warn(`[ads] No pude pausar en Meta antes de eliminar: ${e}`)
    }
  }

  await prisma.adCampaign.update({
    where: { id },
    data: { status: "DELETED" },
  })
  return NextResponse.json({ ok: true })
}

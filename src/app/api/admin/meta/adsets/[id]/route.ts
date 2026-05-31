import { NextResponse } from "next/server"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { updateMetaStatus, audienceConfigSchema } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET / PATCH / DELETE /api/admin/meta/adsets/[id]
 *
 * PATCH: editar nombre / presupuesto / fechas / audiencia.
 * - Mientras es DRAFT: cambios libres en DB.
 * - Si ya está en Meta: cambios suben a Meta (no todos los cambios son
 *   permitidos por Meta una vez ACTIVE — ej. cambiar objetivo). Acá
 *   solo permitimos cambios "seguros" (budget, end_date, audience).
 *
 * DELETE: soft delete (status=DELETED). Si está en Meta, pausa primero.
 */
const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  dailyBudgetCents: z.number().int().positive().optional(),
  endDate: z.coerce.date().optional(),
  audienceConfig: audienceConfigSchema.optional(),
  // Activar/pausar el conjunto individualmente en Meta.
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const adSet = await prisma.adCampaignAdSet.findUnique({
    where: { id },
    include: { ads: { orderBy: { orden: "asc" } } },
  })
  if (!adSet) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ adSet })
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

  const existente = await prisma.adCampaignAdSet.findUnique({ where: { id } })
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Actualizar en DB
  const data: Prisma.AdCampaignAdSetUpdateInput = {}
  if (parsed.data.name) data.name = parsed.data.name
  if (parsed.data.dailyBudgetCents !== undefined) {
    data.dailyBudgetCents = parsed.data.dailyBudgetCents
  }
  if (parsed.data.endDate) data.endDate = parsed.data.endDate
  if (parsed.data.audienceConfig) {
    data.audienceConfig = parsed.data.audienceConfig as Prisma.InputJsonValue
  }

  // Activar / pausar en Meta (solo si el adset ya vive en Meta).
  if (parsed.data.status) {
    if (!existente.metaAdSetId) {
      return NextResponse.json(
        { error: "El conjunto todavía no está publicado en Meta" },
        { status: 409 }
      )
    }
    try {
      await updateMetaStatus(existente.metaAdSetId, parsed.data.status)
      data.status = parsed.data.status === "ACTIVE" ? "ACTIVE" : "PAUSED_BY_USER"
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      )
    }
  }

  const updated = await prisma.adCampaignAdSet.update({ where: { id }, data })

  // TODO: si está en Meta, propagar cambios con POST /{metaAdSetId}
  // Pero hay cambios que Meta NO permite editar tras crear el adset
  // (ej. campaign_id, objective). Por ahora solo persistimos en DB y
  // dejamos que el admin re-publique manualmente si hace cambios fuertes.
  return NextResponse.json({ adSet: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const a = await prisma.adCampaignAdSet.findUnique({
    where: { id },
    select: { metaAdSetId: true, status: true },
  })
  if (!a) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  if (a.metaAdSetId && a.status === "ACTIVE") {
    try {
      await updateMetaStatus(a.metaAdSetId, "PAUSED")
    } catch (e) {
      console.warn("[adset] No pude pausar antes de eliminar:", e)
    }
  }
  await prisma.adCampaignAdSet.update({
    where: { id },
    data: { status: "DELETED" },
  })
  return NextResponse.json({ ok: true })
}

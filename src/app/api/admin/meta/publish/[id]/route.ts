import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { publicarEnMeta } from "@/lib/meta/publication"

export const runtime = "nodejs"
export const maxDuration = 120
export const dynamic = "force-dynamic"

/**
 * Publica una moto en Instagram (carrusel) + cross-post a Facebook Page.
 * POST /api/admin/meta/publish/<modeloId>?force=1   → fuerza republicar
 *                                                      aunque ya tenga igPostId
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const url = new URL(request.url)
  const force = url.searchParams.get("force") === "1"

  const result = await publicarEnMeta(id, { forceRepublish: force })
  if (result.ok) return NextResponse.json(result)
  return NextResponse.json(result, { status: 400 })
}

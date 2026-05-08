import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { refrescarEstadoML } from "@/lib/ml/publication"

export const runtime = "nodejs"
export const maxDuration = 120
export const dynamic = "force-dynamic"

/**
 * Refresca el estado de las motos publicadas en ML consultando ML directamente.
 * Útil cuando ML cambió el estado por su lado (ej: paused → under_review,
 * under_review → active) y nuestro cache de mlEstado quedó desactualizado.
 *
 * POST /api/admin/ml/refresh-status            → refresca todas
 * POST /api/admin/ml/refresh-status { ids:[] } → refresca solo esas
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const ids: unknown = body?.ids
  const idsStr =
    Array.isArray(ids) && ids.length > 0
      ? ids.filter((x): x is string => typeof x === "string")
      : undefined
  const r = await refrescarEstadoML(idsStr)
  return NextResponse.json(r)
}

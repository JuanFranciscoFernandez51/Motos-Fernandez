import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  publicarOActualizar,
  pausarPublicacion,
  cerrarPublicacion,
} from "@/lib/ml/publication"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

/**
 * Acciones sobre la publicación ML de una moto:
 *  POST /api/admin/ml/publish/<modeloId>?action=publish  (default)
 *  POST /api/admin/ml/publish/<modeloId>?action=pause
 *  POST /api/admin/ml/publish/<modeloId>?action=close
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
  const action = url.searchParams.get("action") || "publish"

  let result
  if (action === "pause") result = await pausarPublicacion(id)
  else if (action === "close") result = await cerrarPublicacion(id)
  else result = await publicarOActualizar(id)

  if (result.ok) return NextResponse.json(result)
  return NextResponse.json(result, { status: 400 })
}

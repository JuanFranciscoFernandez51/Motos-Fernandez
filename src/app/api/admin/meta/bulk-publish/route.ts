import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { publicarEnMeta } from "@/lib/meta/publication"

export const runtime = "nodejs"
export const maxDuration = 300
export const dynamic = "force-dynamic"

/**
 * Publica varias motos en IG (carrusel) + FB de una sola vez.
 *
 * Body: { ids: string[] }
 *
 * Procesa una por una (NO en paralelo) para no chocar contra los rate
 * limits de IG, con pausa de 3s entre publicaciones. Devuelve un array
 * con el resultado por moto.
 *
 * Streaming no — devolvemos todo cuando termina. Si necesitamos
 * feedback en vivo, el cliente puede ir consultando por moto, pero
 * por ahora con que devuelva el resultado consolidado es suficiente.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const ids: unknown = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Falta ids[]" }, { status: 400 })
  }
  const idsStr = ids.filter((x): x is string => typeof x === "string")
  if (idsStr.length === 0) {
    return NextResponse.json({ error: "ids vacío" }, { status: 400 })
  }
  if (idsStr.length > 30) {
    return NextResponse.json(
      { error: "Máximo 30 motos por bulk (IG rate-limit)" },
      { status: 400 }
    )
  }

  const resultados: Array<{
    id: string
    ok: boolean
    igPostId?: string
    igPermalink?: string
    error?: string
  }> = []

  for (let i = 0; i < idsStr.length; i++) {
    const id = idsStr[i]
    const r = await publicarEnMeta(id)
    resultados.push({
      id,
      ok: r.ok,
      igPostId: r.igPostId,
      igPermalink: r.igPermalink,
      error: r.error,
    })
    // Pausa entre publicaciones para no martillar IG
    if (i < idsStr.length - 1) {
      await new Promise((res) => setTimeout(res, 3000))
    }
  }

  const ok = resultados.filter((r) => r.ok).length
  const fail = resultados.length - ok
  return NextResponse.json({ ok: true, total: resultados.length, exitos: ok, fallidos: fail, resultados })
}

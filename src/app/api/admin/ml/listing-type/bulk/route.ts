import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const VALIDOS = ["free", "silver", "gold", "gold_premium"] as const

/**
 * Cambia el tipo de publicación ML de varias motos en una sola llamada.
 * No actualiza ML — solo guarda la preferencia. Después tenés que
 * publicar/republicar para que tome efecto.
 *
 * Body: { ids: string[], tipo: "free" | "silver" | "gold" | "gold_premium" }
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const ids: unknown = body?.ids
  const tipo = String(body?.tipo || "")
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Falta ids[]" }, { status: 400 })
  }
  if (!VALIDOS.includes(tipo as typeof VALIDOS[number])) {
    return NextResponse.json(
      { error: `Tipo inválido. Usar: ${VALIDOS.join(", ")}` },
      { status: 400 }
    )
  }
  const idsStr = ids.filter((x): x is string => typeof x === "string")
  const r = await prisma.modelo.updateMany({
    where: { id: { in: idsStr } },
    data: { mlListingType: tipo },
  })
  return NextResponse.json({ ok: true, tipo, actualizadas: r.count })
}

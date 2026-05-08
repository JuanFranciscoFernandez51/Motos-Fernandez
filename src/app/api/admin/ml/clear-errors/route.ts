import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * Limpia los mensajes de error de sincronización de todas las motos
 * (o de una lista específica si se pasa { ids: [...] }).
 *
 * No toca el estado real en ML, solo el campo mlError local.
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
  const r = await prisma.modelo.updateMany({
    where: {
      mlError: { not: null },
      ...(idsStr ? { id: { in: idsStr } } : {}),
    },
    data: { mlError: null },
  })
  return NextResponse.json({ ok: true, limpiados: r.count })
}

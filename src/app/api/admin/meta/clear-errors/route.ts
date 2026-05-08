import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** Limpia los igError de todas las motos (no toca los posts en IG/FB). */
export async function POST() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const r = await prisma.modelo.updateMany({
    where: { igError: { not: null } },
    data: { igError: null },
  })
  return NextResponse.json({ ok: true, limpiados: r.count })
}

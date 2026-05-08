import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const VALIDOS = ["free", "silver", "gold", "gold_premium"] as const

/**
 * Cambia el tipo de publicación ML de una moto (free / silver / gold / gold_premium).
 * No actualiza la publicación en ML — solo guarda la preferencia para la próxima
 * vez que se publique/republique. Si querés aplicarlo ya, después de cambiar el
 * tipo, clickeá "Publicar" para que ML recree la publicación.
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
  const body = await request.json().catch(() => ({}))
  const tipo = String(body.tipo || "")
  if (!VALIDOS.includes(tipo as typeof VALIDOS[number])) {
    return NextResponse.json(
      { error: `Tipo inválido. Usar: ${VALIDOS.join(", ")}` },
      { status: 400 }
    )
  }
  await prisma.modelo.update({
    where: { id },
    data: { mlListingType: tipo },
  })
  return NextResponse.json({ ok: true, tipo })
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

const VALIDOS = ["PENDIENTE", "ACTIVO", "VENDIDO", "CANCELADO", "VENCIDO"] as const

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
  const estado = String(body.estado || "")
  if (!VALIDOS.includes(estado as typeof VALIDOS[number])) {
    return NextResponse.json(
      { error: `Estado inválido. Usar: ${VALIDOS.join(", ")}` },
      { status: 400 }
    )
  }
  await prisma.mandatoVenta.update({
    where: { id },
    data: { estado: estado as typeof VALIDOS[number] },
  })
  revalidatePath("/admin/mandatos")
  revalidatePath(`/admin/mandatos/${id}`)
  return NextResponse.json({ ok: true, estado })
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { invalidateModelos } from "@/lib/cached-queries"
import { despublicarAlVender } from "@/lib/ml/publication"
import { marcarVendidaEnMeta } from "@/lib/meta/publication"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VALIDOS = ["BORRADOR", "RESERVADA", "CONCRETADA", "CANCELADA"] as const

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

  const orden = await prisma.ordenCompra.update({
    where: { id },
    data: { estado: estado as typeof VALIDOS[number] },
  })

  // Side-effects al pasar a CONCRETADA: marcar la moto como vendida +
  // auto-cerrar ML + editar caption IG/FB.
  if (estado === "CONCRETADA" && orden.modeloId) {
    await prisma.modelo
      .update({
        where: { id: orden.modeloId },
        data: { vendida: true, fechaVenta: orden.fecha, activo: false },
      })
      .catch(() => null)
    await Promise.allSettled([
      despublicarAlVender(orden.modeloId),
      marcarVendidaEnMeta(orden.modeloId),
    ])
  } else if (estado === "RESERVADA" && orden.modeloId) {
    await prisma.modelo
      .update({
        where: { id: orden.modeloId },
        data: { etiqueta: "RESERVADA" },
      })
      .catch(() => null)
  }

  revalidatePath("/admin/ordenes-compra")
  revalidatePath(`/admin/ordenes-compra/${id}`)
  revalidatePath("/admin/modelos")
  invalidateModelos()
  return NextResponse.json({ ok: true, estado: orden.estado })
}

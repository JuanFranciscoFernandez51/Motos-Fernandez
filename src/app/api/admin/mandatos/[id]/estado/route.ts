import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { sincronizarMandatoVendido } from "@/lib/venta-moto-helpers"
import { invalidateModelos } from "@/lib/cached-queries"

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

  if (estado === "VENDIDO") {
    // Sincronizar con el modelo asociado: marcar como vendida + activo=false
    // + fechaVenta + etiqueta=null + pausar ML. Si no hay modeloId no hace nada.
    await prisma.$transaction(async (tx) => {
      await sincronizarMandatoVendido(tx, { mandatoId: id })
    })
  } else {
    // Cualquier otro estado: solo actualizar el mandato, no tocar el modelo
    await prisma.mandatoVenta.update({
      where: { id },
      data: { estado: estado as typeof VALIDOS[number] },
    })
  }

  revalidatePath("/admin/mandatos")
  revalidatePath(`/admin/mandatos/${id}`)
  revalidatePath("/admin/modelos")
  revalidatePath("/admin/stock-motos")
  revalidatePath("/catalogo")
  invalidateModelos()
  return NextResponse.json({ ok: true, estado })
}

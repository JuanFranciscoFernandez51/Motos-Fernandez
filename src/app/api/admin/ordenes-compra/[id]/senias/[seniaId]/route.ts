import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireSection } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/**
 * DELETE /api/admin/ordenes-compra/[id]/senias/[seniaId]
 * Borra la seña y, si tenía movimiento de caja asociado, también lo borra
 * (para que el saldo de Finanzas quede correcto).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; seniaId: string }> }
) {
  const session = await requireSection("ORDENES_COMPRA")
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, seniaId } = await params
  try {
    const senia = await prisma.oCSenia.findUnique({ where: { id: seniaId }, select: { movimientoFinancieroId: true } })
    await prisma.$transaction(async (tx) => {
      await tx.oCSenia.delete({ where: { id: seniaId } })
      if (senia?.movimientoFinancieroId) {
        await tx.movimientoFinanciero.delete({ where: { id: senia.movimientoFinancieroId } }).catch(() => {})
      }
    })
    revalidatePath(`/admin/ordenes-compra/${id}`)
    revalidatePath("/admin/finanzas")
    revalidatePath("/admin/finanzas/movimientos")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al eliminar" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * DELETE /api/admin/ordenes-compra/[id]
 * Borra la OC. Cascade limpia OCPermuta y OCPago. Si tiene Financiacion
 * asociada, queda con ordenCompraId=null (SetNull).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  try {
    await prisma.ordenCompra.delete({ where: { id } })
    revalidatePath("/admin/ordenes-compra")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al eliminar" },
      { status: 400 }
    )
  }
}

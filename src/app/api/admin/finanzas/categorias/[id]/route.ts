import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH — renombrar (arrastra los movimientos con el nombre viejo) o activar/desactivar.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const cat = await prisma.categoriaFinanciera.findUnique({ where: { id } })
  if (!cat) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  try {
    if ("nombre" in b && b.nombre && String(b.nombre).trim() !== cat.nombre) {
      const nuevo = String(b.nombre).trim()
      // Arrastrar los movimientos que usaban el nombre viejo
      await prisma.$transaction([
        prisma.categoriaFinanciera.update({ where: { id }, data: { nombre: nuevo } }),
        prisma.movimientoFinanciero.updateMany({
          where: { categoria: cat.nombre },
          data: { categoria: nuevo },
        }),
      ])
    }
    if ("activa" in b) {
      await prisma.categoriaFinanciera.update({ where: { id }, data: { activa: !!b.activa } })
    }
    revalidatePath("/admin/tesoreria/finanzas/cuentas")
    revalidatePath("/admin/tesoreria/finanzas/movimientos")
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Ya existe esa categoría" : "Error al guardar"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** DELETE — borra la categoría (los movimientos conservan el texto). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  try {
    await prisma.categoriaFinanciera.delete({ where: { id } })
    revalidatePath("/admin/tesoreria/finanzas/cuentas")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}

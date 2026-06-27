import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/** PATCH → edición inline de un costo fijo (concepto, categoría, monto, notas, activo). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const data: Record<string, unknown> = {}
    if ("concepto" in b) data.concepto = b.concepto
    if ("categoria" in b) data.categoria = b.categoria
    if ("monto" in b) data.monto = Math.round(Number(b.monto) || 0)
    if ("notas" in b) data.notas = b.notas || null
    if ("activo" in b) data.activo = !!b.activo
    const costo = await prisma.costoFijo.update({ where: { id }, data })
    revalidatePath("/admin/finanzas")
    return NextResponse.json(costo)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.costoFijo.delete({ where: { id } })
    revalidatePath("/admin/finanzas")
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

/** PATCH /api/admin/contador/obligacion/[id] — edita una obligación recurrente. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof b.diaVencimiento === "number")
    data.diaVencimiento = Math.min(31, Math.max(1, Math.round(b.diaVencimiento)))
  if ("montoEstimado" in b)
    data.montoEstimado = b.montoEstimado ? Math.round(Number(b.montoEstimado)) : null
  if (typeof b.activo === "boolean") data.activo = b.activo
  if (typeof b.titulo === "string" && b.titulo.trim()) data.titulo = b.titulo.trim()
  if ("notas" in b) data.notas = b.notas ? String(b.notas).trim() : null

  try {
    const obligacion = await prisma.obligacionFiscal.update({ where: { id }, data })
    revalidatePath("/admin/contador")
    return NextResponse.json({ ok: true, obligacion })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 }
    )
  }
}

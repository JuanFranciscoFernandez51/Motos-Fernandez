import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/** PATCH /api/admin/finanzas/config — actualizar parámetros del negocio (singleton). */
export async function PATCH(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const b = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  const intFields = ["ventasEstimadasMes", "margenBrutoVenta", "ivaPorcentaje"]
  for (const f of intFields) if (f in b) data[f] = Math.max(0, Math.round(Number(b[f]) || 0))
  const floatFields = ["markupRepuestos", "markupAccesorios", "markupServicio"]
  for (const f of floatFields) if (f in b) data[f] = Math.max(0, Number(b[f]) || 0)

  await prisma.finanzasConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  })
  revalidatePath("/admin/tesoreria/finanzas/costos")
  revalidatePath("/admin/tesoreria/finanzas/calculador")
  return NextResponse.json({ ok: true })
}

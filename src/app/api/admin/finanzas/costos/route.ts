import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  concepto: z.string().min(1),
  monto: z.number().int().nonnegative(),
  categoria: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  const count = await prisma.costoFijo.count()
  await prisma.costoFijo.create({ data: { ...parsed.data, orden: count } })
  revalidatePath("/admin/tesoreria/finanzas/costos")
  return NextResponse.json({ ok: true })
}

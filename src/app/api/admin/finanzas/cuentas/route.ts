import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  nombre: z.string().min(1),
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  saldoInicial: z.number().int().default(0),
  excluirDeResultado: z.boolean().default(false),
})

/** POST /api/admin/finanzas/cuentas */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }
  try {
    const count = await prisma.cuentaFinanciera.count()
    await prisma.cuentaFinanciera.create({
      data: { ...parsed.data, orden: count },
    })
    revalidatePath("/admin/tesoreria/finanzas/cuentas")
    revalidatePath("/admin/tesoreria/finanzas")
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Ya existe una cuenta con ese nombre" : "Error al crear"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

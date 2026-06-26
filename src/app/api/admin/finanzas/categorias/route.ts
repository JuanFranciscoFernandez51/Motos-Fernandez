import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(["INGRESO", "GASTO"]),
})

/** POST /api/admin/finanzas/categorias */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  try {
    const count = await prisma.categoriaFinanciera.count({ where: { tipo: parsed.data.tipo } })
    await prisma.categoriaFinanciera.create({
      data: { nombre: parsed.data.nombre.trim(), tipo: parsed.data.tipo, orden: count },
    })
    revalidatePath("/admin/tesoreria/finanzas/cuentas")
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Ya existe esa categoría" : "Error al crear"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

const schema = z.object({
  sentido: z.enum(["COBRAR", "PAGAR"]),
  cliente: z.string().min(1),
  tipo: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  monto: z.number().int().positive(),
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  fechaVencimiento: z.string().optional().nullable(),
})

/** POST /api/admin/finanzas/cxc — alta de crédito a cobrar / deuda a pagar. */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  const b = parsed.data

  await prisma.cuentaPorCobrar.create({
    data: {
      sentido: b.sentido,
      cliente: b.cliente,
      tipo: b.tipo,
      descripcion: b.descripcion || null,
      monto: b.monto,
      moneda: b.moneda,
      fechaVencimiento: b.fechaVencimiento ? fechaDeInput(b.fechaVencimiento) : null,
    },
  })
  revalidatePath("/admin/tesoreria/finanzas/cuentas-cheques")
  revalidatePath("/admin/tesoreria/finanzas")
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

const schema = z.object({
  tipo: z.enum(["A_COBRAR", "A_PAGAR"]),
  beneficiario: z.string().min(1),
  monto: z.number().int().positive(),
  moneda: z.enum(["ARS", "USD"]).default("ARS"),
  fechaVencimiento: z.string().min(8),
  formato: z.string().default("E-Cheq"),
})

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  const b = parsed.data
  await prisma.cheque.create({
    data: {
      tipo: b.tipo,
      beneficiario: b.beneficiario,
      monto: b.monto,
      moneda: b.moneda,
      fechaVencimiento: fechaDeInput(b.fechaVencimiento),
      formato: b.formato,
    },
  })
  revalidatePath("/admin/tesoreria/finanzas/cuentas-cheques")
  return NextResponse.json({ ok: true })
}

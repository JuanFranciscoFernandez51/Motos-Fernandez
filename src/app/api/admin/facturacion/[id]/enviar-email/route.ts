import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { sendFacturaPorEmail } from "@/lib/pdf/factura-render"

export const dynamic = "force-dynamic"

const bodySchema = z.object({ email: z.string().email("Email inválido") })

/** POST /api/admin/facturacion/[id]/enviar-email — reenvía el PDF por mail. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    )
  }

  const { id } = await params
  const f = await prisma.factura.findUnique({ where: { id } })
  if (!f) return NextResponse.json({ ok: false, error: "No encontrada" }, { status: 404 })
  if (f.estado !== "EMITIDA" || !f.cae || f.numero == null) {
    return NextResponse.json(
      { ok: false, error: "La factura no está emitida (sin CAE)" },
      { status: 400 }
    )
  }

  try {
    const r = await sendFacturaPorEmail(f, parsed.data.email)
    if (r.skipped) {
      return NextResponse.json(
        { ok: false, error: "El envío de emails no está configurado (RESEND_API_KEY)." },
        { status: 503 }
      )
    }
    if ("error" in r && r.error) {
      return NextResponse.json({ ok: false, error: "No se pudo enviar el email." }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error al enviar" },
      { status: 500 }
    )
  }
}

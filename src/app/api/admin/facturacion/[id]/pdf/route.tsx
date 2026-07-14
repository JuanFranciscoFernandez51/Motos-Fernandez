import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { renderFacturaPdf, facturaFileName } from "@/lib/pdf/factura-render"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const f = await prisma.factura.findUnique({ where: { id } })
  if (!f) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  if (f.estado !== "EMITIDA" || !f.cae || f.numero == null) {
    return NextResponse.json(
      { error: "La factura no está emitida (sin CAE)" },
      { status: 400 }
    )
  }

  const pdf = await renderFacturaPdf(f)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facturaFileName(f)}"`,
    },
  })
}

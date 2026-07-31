/**
 * GET /api/admin/qr/[id]/svg
 * Devuelve el QR como SVG vectorial — ideal para imprimir en acrílico
 * (escala infinita, sin pérdida de calidad).
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { urlDeQrPara } from "@/lib/qr-config"
import QRCode from "qrcode"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const link = await prisma.qrShortlink.findUnique({ where: { id } })
  if (!link) {
    return NextResponse.json({ error: "Shortlink no encontrado" }, { status: 404 })
  }

  const url = urlDeQrPara(link.codigo)
  // Margen amplio para que se vea bien centrado al cortar el acrílico
  // ErrorCorrectionLevel H = más resistente (sirve si la impresión queda con manchas)
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "H",
    width: 1024,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  })

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="motosfernandez-qr-${link.codigo}.svg"`,
      "Cache-Control": "no-store",
    },
  })
}

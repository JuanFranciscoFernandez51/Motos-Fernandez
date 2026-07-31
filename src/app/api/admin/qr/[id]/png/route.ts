/**
 * GET /api/admin/qr/[id]/png?size=2048
 * Devuelve el QR como PNG en alta resolución.
 * Por default 2048px (suficiente para acrílicos de hasta 1m).
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { urlDeQrPara } from "@/lib/qr-config"
import QRCode from "qrcode"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const sizeRaw = parseInt(searchParams.get("size") || "2048", 10)
  const size = Math.min(Math.max(sizeRaw, 256), 4096)

  const link = await prisma.qrShortlink.findUnique({ where: { id } })
  if (!link) {
    return NextResponse.json({ error: "Shortlink no encontrado" }, { status: 404 })
  }

  const url = urlDeQrPara(link.codigo)
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    margin: 2,
    errorCorrectionLevel: "H",
    width: size,
    color: { dark: "#000000", light: "#FFFFFF" },
  })

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="motosfernandez-qr-${link.codigo}-${size}px.png"`,
      "Cache-Control": "no-store",
    },
  })
}

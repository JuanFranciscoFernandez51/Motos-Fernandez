/**
 * Shortlink público para QRs físicos.
 * GET /m/[codigo] → redirect 308 al modelo configurado.
 *
 * Se usa una route.ts en lugar de una page.tsx para evitar render: queremos un
 * redirect HTTP duro que los navegadores y crawlers respeten.
 *
 * Si el código no existe, redirige al catálogo general.
 * Si está inactivo, también.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params
  const codigoLimpio = codigo.toLowerCase().trim()
  const origin = new URL(req.url).origin

  const link = await prisma.qrShortlink.findUnique({
    where: { codigo: codigoLimpio },
    include: { modelo: { select: { slug: true } } },
  })

  // No existe o inactivo → al catálogo
  if (!link || !link.activo) {
    return NextResponse.redirect(`${origin}/catalogo`, 307)
  }

  // Incrementar scans (fire-and-forget — no bloqueamos el redirect)
  prisma.qrShortlink
    .update({
      where: { id: link.id },
      data: { scans: { increment: 1 }, ultimoScan: new Date() },
    })
    .catch(() => {
      // si falla el contador, seguimos con el redirect
    })

  // Resolver destino
  let destino = `${origin}/catalogo`
  if (link.modelo?.slug) {
    destino = `${origin}/catalogo/${link.modelo.slug}`
  } else if (link.urlCustom) {
    destino = link.urlCustom.startsWith("http")
      ? link.urlCustom
      : `${origin}${link.urlCustom.startsWith("/") ? "" : "/"}${link.urlCustom}`
  }

  // 307 (temporary) — no se cachea permanentemente; si en el futuro cambia el destino
  // del shortlink, el navegador respeta la nueva ruta. Justamente lo que necesitamos
  // para QRs físicos: la URL en el acrílico es fija, pero el destino es editable.
  return NextResponse.redirect(destino, 307)
}

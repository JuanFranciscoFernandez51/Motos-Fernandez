import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/site/mundial → { active: boolean }
 *
 * El Modo Mundial está activo si el switch manual (mundialActivo) está ON y,
 * si hay ventana de fechas cargada, la fecha de hoy cae dentro de
 * [mundialDesde, mundialHasta]. Sin fechas = activo mientras el switch esté ON.
 */
export async function GET() {
  try {
    const cfg = await prisma.siteConfig.findUnique({
      where: { id: "singleton" },
      select: { mundialActivo: true, mundialDesde: true, mundialHasta: true },
    })
    let active = false
    if (cfg?.mundialActivo) {
      const now = new Date()
      const desdeOk = !cfg.mundialDesde || now >= cfg.mundialDesde
      const hastaOk = !cfg.mundialHasta || now <= cfg.mundialHasta
      active = desdeOk && hastaOk
    }
    return NextResponse.json({ active })
  } catch {
    return NextResponse.json({ active: false })
  }
}

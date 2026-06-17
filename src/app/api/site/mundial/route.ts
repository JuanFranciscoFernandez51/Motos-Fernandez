import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/site/mundial
 * → { active, barraEstilo, confetti, confettiNivel }
 *
 * Activo = switch manual ON y (sin fechas, o hoy dentro de [desde, hasta]).
 */
export async function GET() {
  try {
    const cfg = await prisma.siteConfig.findUnique({
      where: { id: "singleton" },
      select: {
        mundialActivo: true,
        mundialDesde: true,
        mundialHasta: true,
        mundialBarraEstilo: true,
        mundialConfetti: true,
        mundialConfettiNivel: true,
      },
    })
    let active = false
    if (cfg?.mundialActivo) {
      const now = new Date()
      const desdeOk = !cfg.mundialDesde || now >= cfg.mundialDesde
      const hastaOk = !cfg.mundialHasta || now <= cfg.mundialHasta
      active = desdeOk && hastaOk
    }
    return NextResponse.json({
      active,
      barraEstilo: cfg?.mundialBarraEstilo === "marquee" ? "marquee" : "bandera",
      confetti: cfg?.mundialConfetti ?? true,
      confettiNivel: cfg?.mundialConfettiNivel || "sutil",
    })
  } catch {
    return NextResponse.json({ active: false })
  }
}

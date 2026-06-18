import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/site/mundial
 * → { active, barraEstilo, confetti, confettiNivel, promoEnvio }
 *
 * Activo = switch manual ON y (sin fechas, o hoy dentro de [desde, hasta]).
 * promoEnvio = promoEnvioActiva ON y dentro de la misma ventana de fechas.
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
        promoEnvioActiva: true,
      },
    })
    let dentroVentana = false
    if (cfg) {
      const now = new Date()
      const desdeOk = !cfg.mundialDesde || now >= cfg.mundialDesde
      const hastaOk = !cfg.mundialHasta || now <= cfg.mundialHasta
      dentroVentana = desdeOk && hastaOk
    }
    const active = Boolean(cfg?.mundialActivo) && dentroVentana
    const promoEnvio = Boolean(cfg?.promoEnvioActiva) && dentroVentana
    return NextResponse.json({
      active,
      barraEstilo: cfg?.mundialBarraEstilo === "marquee" ? "marquee" : "bandera",
      confetti: cfg?.mundialConfetti ?? true,
      confettiNivel: cfg?.mundialConfettiNivel || "sutil",
      promoEnvio,
    })
  } catch {
    return NextResponse.json({ active: false, promoEnvio: false })
  }
}

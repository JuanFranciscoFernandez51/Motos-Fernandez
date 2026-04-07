import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [visitas, conversiones] = await Promise.all([
      prisma.visita.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.conversion.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // Visits per day
    const visitasPorDia: Record<string, number> = {}
    visitas.forEach((v) => {
      const day = v.createdAt.toISOString().split("T")[0]
      visitasPorDia[day] = (visitasPorDia[day] || 0) + 1
    })

    // Top pages
    const paginasCount: Record<string, number> = {}
    visitas.forEach((v) => {
      paginasCount[v.pagina] = (paginasCount[v.pagina] || 0) + 1
    })
    const topPaginas = Object.entries(paginasCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pagina, count]) => ({ pagina, count }))

    // Devices
    const dispositivosCount: Record<string, number> = {}
    visitas.forEach((v) => {
      const device = v.device || "Desconocido"
      dispositivosCount[device] = (dispositivosCount[device] || 0) + 1
    })
    const dispositivos = Object.entries(dispositivosCount)
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count }))

    // Sources
    const fuentesCount: Record<string, number> = {}
    visitas.forEach((v) => {
      const referrer = v.referrer || "Directo"
      fuentesCount[referrer] = (fuentesCount[referrer] || 0) + 1
    })
    const fuentes = Object.entries(fuentesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([fuente, count]) => ({ fuente, count }))

    // Cities
    const ciudadesCount: Record<string, number> = {}
    visitas.forEach((v) => {
      const ciudad = v.ciudad || "Desconocida"
      ciudadesCount[ciudad] = (ciudadesCount[ciudad] || 0) + 1
    })
    const ciudades = Object.entries(ciudadesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ciudad, count]) => ({ ciudad, count }))

    // Conversions by event
    const conversionesPorEvento: Record<string, number> = {}
    conversiones.forEach((c) => {
      conversionesPorEvento[c.evento] = (conversionesPorEvento[c.evento] || 0) + 1
    })
    const conversionesByEvent = Object.entries(conversionesPorEvento)
      .sort((a, b) => b[1] - a[1])
      .map(([evento, count]) => ({ evento, count }))

    return NextResponse.json({
      totalVisitas: visitas.length,
      totalConversiones: conversiones.length,
      visitasPorDia,
      topPaginas,
      dispositivos,
      fuentes,
      ciudades,
      conversionesByEvent,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json(
      { error: "Error al obtener datos de analytics" },
      { status: 500 }
    )
  }
}

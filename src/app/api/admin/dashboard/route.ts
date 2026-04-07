import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [pedidosHoy, turnosPendientes, leadsNuevos, ventasMes] = await Promise.all([
      prisma.pedido.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.turno.count({
        where: { estado: "PENDIENTE" },
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfDay },
          temperatura: "NUEVO",
        },
      }),
      prisma.pedido.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          estadoPago: "APROBADO",
        },
        _sum: { total: true },
      }),
    ])

    return NextResponse.json({
      pedidosHoy,
      turnosPendientes,
      leadsNuevos,
      ventasMes: ventasMes._sum.total ?? 0,
    })
  } catch (error) {
    console.error("Error fetching dashboard:", error)
    return NextResponse.json(
      { error: "Error al obtener datos del dashboard" },
      { status: 500 }
    )
  }
}

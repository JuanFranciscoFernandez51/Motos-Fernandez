import { prisma } from "@/lib/prisma"
import { TurnosClient } from "./turnos-client"

export const dynamic = "force-dynamic"

export default async function TurnosPage() {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [turnos, diasBloqueados, pendientes, confirmadosHoy, totalMes] = await Promise.all([
    prisma.turno.findMany({
      orderBy: { createdAt: "desc" },
      include: { modelo: true },
    }),
    prisma.diaBloqueado.findMany({ orderBy: { fecha: "asc" } }),
    prisma.turno.count({ where: { estado: "PENDIENTE" } }),
    prisma.turno.count({
      where: {
        estado: "CONFIRMADO",
        fechaConfirmada: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.turno.count({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
  ])

  // Serialize dates to strings for client component
  const turnosSerializados = turnos.map(t => ({
    ...t,
    fechaPreferida: t.fechaPreferida?.toISOString() ?? null,
    fechaConfirmada: t.fechaConfirmada?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  const bloqueadosSerializados = diasBloqueados.map(d => ({
    ...d,
    fecha: d.fecha.toISOString(),
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <TurnosClient
      turnos={turnosSerializados}
      diasBloqueados={bloqueadosSerializados}
      pendientes={pendientes}
      confirmadosHoy={confirmadosHoy}
      totalMes={totalMes}
    />
  )
}

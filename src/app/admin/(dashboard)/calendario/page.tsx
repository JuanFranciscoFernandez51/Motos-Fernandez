import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CalendarioMes } from "./calendario-client"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const { y: yParam, m: mParam } = await searchParams
  const today = new Date()
  const year = yParam ? parseInt(yParam) : today.getFullYear()
  const month = mParam ? parseInt(mParam) - 1 : today.getMonth() // 0-11

  const desde = new Date(year, month, 1, 0, 0, 0, 0)
  const hasta = new Date(year, month + 1, 0, 23, 59, 59, 999)

  // Eventos del mes en paralelo
  const [turnos, otsConFechaPrometida, cuotasDelMes] = await Promise.all([
    prisma.turno.findMany({
      where: {
        OR: [
          { fechaConfirmada: { gte: desde, lte: hasta } },
          { fechaConfirmada: null, fechaPreferida: { gte: desde, lte: hasta } },
        ],
      },
      orderBy: [{ fechaConfirmada: "asc" }, { fechaPreferida: "asc" }],
    }),
    prisma.ordenTrabajo.findMany({
      where: {
        fechaPrometida: { gte: desde, lte: hasta },
        estado: { not: "ENTREGADA" },
      },
      include: { cliente: { select: { nombre: true, apellido: true } } },
      orderBy: { fechaPrometida: "asc" },
    }),
    prisma.cuotaFinanciacion.findMany({
      where: {
        fechaVencimiento: { gte: desde, lte: hasta },
        estado: { in: ["PENDIENTE", "ATRASADA"] },
      },
      include: {
        financiacion: {
          include: {
            cliente: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fechaVencimiento: "asc" },
    }),
  ])

  // Mapear todo a un shape comun
  type Evento = {
    id: string
    fecha: Date
    tipo: "TURNO" | "OT" | "CUOTA"
    titulo: string
    subtitulo: string
    href: string
    estado?: string
  }

  const eventos: Evento[] = [
    ...turnos.map((t) => ({
      id: `turno-${t.id}`,
      fecha: t.fechaConfirmada || t.fechaPreferida || new Date(),
      tipo: "TURNO" as const,
      titulo: t.nombre,
      subtitulo: t.tipoServicio,
      href: `/admin/turnos`,
      estado: t.estado,
    })),
    ...otsConFechaPrometida.map((o) => ({
      id: `ot-${o.id}`,
      fecha: o.fechaPrometida!,
      tipo: "OT" as const,
      titulo: `OT-${String(o.numero).padStart(4, "0")}`,
      subtitulo: `${o.cliente.apellido}, ${o.cliente.nombre} · ${o.motoMarca} ${o.motoModelo}`,
      href: `/admin/taller/${o.id}`,
      estado: o.estado,
    })),
    ...cuotasDelMes.map((c) => ({
      id: `cuota-${c.id}`,
      fecha: c.fechaVencimiento,
      tipo: "CUOTA" as const,
      titulo: `FIN-${String(c.financiacion.numero).padStart(4, "0")} · cuota ${c.numero}`,
      subtitulo: `${c.financiacion.cliente.apellido}, ${c.financiacion.cliente.nombre} · $${c.monto.toLocaleString("es-AR")}`,
      href: `/admin/tesoreria/financiaciones/${c.financiacionId}`,
      estado: c.estado,
    })),
  ]

  // Mes anterior y siguiente para navegacion
  const prevMonth = month === 0 ? 12 : month
  const prevYear = month === 0 ? year - 1 : year
  const nextMonth = month === 11 ? 1 : month + 2
  const nextYear = month === 11 ? year + 1 : year

  const mesNombre = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(desde)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="size-6 text-[#7C3AED]" />
            Calendario
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Turnos, entregas de OT y vencimientos de cuotas en una vista única.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/calendario?y=${prevYear}&m=${prevMonth}`} />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-semibold capitalize px-3 min-w-[160px] text-center">
            {mesNombre}
          </p>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/calendario?y=${nextYear}&m=${nextMonth}`} />}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/admin/calendario" />}
            className="ml-2"
          >
            Hoy
          </Button>
        </div>
      </div>

      <CalendarioMes year={year} month={month} eventos={eventos} />

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-orange-500" /> Turnos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-emerald-500" /> Entregas OT
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-500" /> Cuotas a vencer
        </span>
      </div>
    </div>
  )
}

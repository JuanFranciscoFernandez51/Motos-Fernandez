import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatPrice, ESTADO_PEDIDO_LABELS, TEMPERATURA_LABELS, ORIGEN_LABELS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  CalendarClock,
  Users,
  DollarSign,
  Eye,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Bike,
  Mail,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"

export const dynamic = "force-dynamic"

// Argentina timezone offset: UTC-3
const AR_OFFSET_MS = -3 * 60 * 60 * 1000

function toArgentinaDate(date: Date): Date {
  return new Date(date.getTime() + AR_OFFSET_MS)
}

// Colors per origen for the pills
const ORIGEN_COLORS: Record<string, string> = {
  WEB:          "bg-blue-100 text-blue-800",
  WHATSAPP:     "bg-green-100 text-green-800",
  INSTAGRAM:    "bg-pink-100 text-pink-800",
  MARKETPLACE:  "bg-orange-100 text-orange-800",
  MERCADOLIBRE: "bg-yellow-100 text-yellow-800",
  TELEFONO:     "bg-purple-100 text-purple-800",
  PRESENCIAL:   "bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-100",
}

// Bar-only bg color (must be a full standalone class for Tailwind JIT)
const ORIGEN_BAR_COLOR: Record<string, string> = {
  WEB:          "bg-blue-400",
  WHATSAPP:     "bg-green-400",
  INSTAGRAM:    "bg-pink-400",
  MARKETPLACE:  "bg-orange-400",
  MERCADOLIBRE: "bg-yellow-400",
  TELEFONO:     "bg-purple-400",
  PRESENCIAL:   "bg-gray-400",
}

type VentaMes = {
  mes: string      // "YYYY-MM"
  total: bigint
  cantidad: bigint
}

type LeadOrigen = {
  origen: string
  cantidad: bigint
}

export default async function AdminDashboardPage() {
  // Use Argentina local time for "today" and "this month"
  const nowUTC = new Date()
  const nowAR = toArgentinaDate(nowUTC)

  // Start of today in AR, converted back to UTC for DB queries
  const todayAR = new Date(nowAR)
  todayAR.setHours(0, 0, 0, 0)
  const todayUTC = new Date(todayAR.getTime() - AR_OFFSET_MS)

  // Start of this month in AR, converted back to UTC
  const monthStartAR = new Date(nowAR.getFullYear(), nowAR.getMonth(), 1, 0, 0, 0, 0)
  const monthStartUTC = new Date(monthStartAR.getTime() - AR_OFFSET_MS)

  // 7 days ago UTC
  const weekAgoUTC = new Date(nowUTC)
  weekAgoUTC.setDate(weekAgoUTC.getDate() - 7)
  weekAgoUTC.setHours(0, 0, 0, 0)

  // 6 months ago (first day, AR → UTC)
  const sixMonthsAgoAR = new Date(nowAR.getFullYear(), nowAR.getMonth() - 5, 1, 0, 0, 0, 0)
  const sixMonthsAgoUTC = new Date(sixMonthsAgoAR.getTime() - AR_OFFSET_MS)

  // 30 days ago UTC (para métricas mensuales deslizantes)
  const thirtyDaysAgoUTC = new Date(nowUTC)
  thirtyDaysAgoUTC.setDate(thirtyDaysAgoUTC.getDate() - 30)
  thirtyDaysAgoUTC.setHours(0, 0, 0, 0)

  // Comparación de ingresos: últimos 7 días vs 7 días previos
  const fourteenDaysAgoUTC = new Date(nowUTC)
  fourteenDaysAgoUTC.setDate(fourteenDaysAgoUTC.getDate() - 14)
  fourteenDaysAgoUTC.setHours(0, 0, 0, 0)

  const [
    pedidosHoy,
    turnosPendientes,
    leadsNuevos,
    ventasMes,
    recentOrders,
    leadsSinContactar,
    ventasPorMesRaw,
    leadsPorOrigenRaw,
    visitasHoy,
    visitasSemana,
    visitasPorPagina,
    ciudades,
    // Nuevas métricas
    conversionesChat,
    productosMasVistosRaw,
    modelosMasVistosRaw,
    contactosNoLeidos,
    contactosLeidos,
    pedidosAprobados30d,
    visitasTienda30d,
    ingresosUltimos7d,
    ingresosPrevios7d,
  ] = await Promise.all([
    prisma.pedido.count({
      where: { createdAt: { gte: todayUTC } },
    }),
    prisma.turno.count({
      where: { estado: "PENDIENTE" },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: weekAgoUTC }, temperatura: "NUEVO" },
    }),
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: {
        estado: { in: ["PAGO_CONFIRMADO", "PREPARANDO", "ENVIADO", "ENTREGADO"] },
        createdAt: { gte: monthStartUTC },
      },
    }),
    prisma.pedido.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { producto: true } } },
    }),
    prisma.lead.findMany({
      take: 5,
      where: { temperatura: "NUEVO" },
      orderBy: { createdAt: "desc" },
      include: { modelo: true },
    }),
    // Monthly sales: group by month in AR timezone (UTC-3)
    prisma.$queryRaw<VentaMes[]>`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS mes,
        SUM(total)::bigint AS total,
        COUNT(*)::bigint AS cantidad
      FROM "Pedido"
      WHERE
        "createdAt" >= ${sixMonthsAgoUTC}
        AND estado IN ('PAGO_CONFIRMADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO')
      GROUP BY mes
      ORDER BY mes ASC
    `,
    // Leads by origen
    prisma.$queryRaw<LeadOrigen[]>`
      SELECT
        origen,
        COUNT(*)::bigint AS cantidad
      FROM "Lead"
      GROUP BY origen
      ORDER BY cantidad DESC
    `,
    // Visitas de hoy
    prisma.visita.count({
      where: { createdAt: { gte: todayUTC } },
    }),
    // Visitas de los últimos 7 días
    prisma.visita.count({
      where: { createdAt: { gte: weekAgoUTC } },
    }),
    // Visitas por página (top 5, últimos 7 días)
    prisma.visita.groupBy({
      by: ["pagina"],
      _count: { pagina: true },
      orderBy: { _count: { pagina: "desc" } },
      take: 5,
      where: { createdAt: { gte: weekAgoUTC } },
    }),
    // Ciudades top (últimos 7 días)
    prisma.visita.groupBy({
      by: ["ciudad"],
      _count: { ciudad: true },
      orderBy: { _count: { ciudad: "desc" } },
      take: 5,
      where: { createdAt: { gte: weekAgoUTC }, ciudad: { not: null } },
    }),
    // Conversiones del chatbot (últimos 30 días)
    prisma.conversion.count({
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        evento: { contains: "chat", mode: "insensitive" },
      },
    }),
    // Productos más vistos (top 5, últimos 30 días)
    prisma.visita.groupBy({
      by: ["pagina"],
      _count: { pagina: true },
      orderBy: { _count: { pagina: "desc" } },
      take: 5,
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        pagina: { startsWith: "/tienda/" },
      },
    }),
    // Modelos más consultados (top 5, últimos 30 días)
    prisma.visita.groupBy({
      by: ["pagina"],
      _count: { pagina: true },
      orderBy: { _count: { pagina: "desc" } },
      take: 5,
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        pagina: { startsWith: "/catalogo/" },
      },
    }),
    // Consultas por formulario (últimos 30 días) - no leídas
    prisma.contactForm.count({
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        leido: false,
      },
    }),
    // Consultas por formulario (últimos 30 días) - leídas
    prisma.contactForm.count({
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        leido: true,
      },
    }),
    // Pedidos aprobados últimos 30 días (para tasa de conversión)
    prisma.pedido.count({
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        estadoPago: "APROBADO",
      },
    }),
    // Visitas a /tienda últimos 30 días (para tasa de conversión)
    prisma.visita.count({
      where: {
        createdAt: { gte: thirtyDaysAgoUTC },
        pagina: { startsWith: "/tienda" },
      },
    }),
    // Ingresos últimos 7 días
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: weekAgoUTC },
        estadoPago: "APROBADO",
      },
    }),
    // Ingresos 7 días previos (entre 14 y 7 días atrás)
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: fourteenDaysAgoUTC, lt: weekAgoUTC },
        estadoPago: "APROBADO",
      },
    }),
  ])

  // Build all 6 months array (including months with 0 sales)
  const mesesEspanol = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ]

  const ventasMap = new Map(ventasPorMesRaw.map((v) => [v.mes, Number(v.total)]))

  const ventasPorMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(nowAR.getFullYear(), nowAR.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    return {
      mes: mesesEspanol[d.getMonth()],
      key,
      total: ventasMap.get(key) ?? 0,
    }
  })

  const maxVentas = Math.max(...ventasPorMes.map((v) => v.total), 1)

  // Leads por origen (convert bigint to number)
  const leadsPorOrigen = leadsPorOrigenRaw.map((l) => ({
    origen: l.origen,
    cantidad: Number(l.cantidad),
  }))
  const totalLeads = leadsPorOrigen.reduce((acc, l) => acc + l.cantidad, 0)

  // Procesar productos y modelos más vistos (limpiar slug de la URL)
  const productosMasVistos = productosMasVistosRaw.map((v) => ({
    slug: v.pagina.replace(/^\/tienda\//, "").replace(/\/$/, "") || v.pagina,
    pagina: v.pagina,
    cantidad: v._count.pagina,
  }))

  const modelosMasVistos = modelosMasVistosRaw.map((v) => ({
    slug: v.pagina.replace(/^\/catalogo\//, "").replace(/\/$/, "") || v.pagina,
    pagina: v.pagina,
    cantidad: v._count.pagina,
  }))

  // Tasa de conversión (pedidos aprobados / visitas a /tienda)
  const tasaConversion =
    visitasTienda30d > 0
      ? (pedidosAprobados30d / visitasTienda30d) * 100
      : 0

  // Comparación ingresos 7d vs 7d previos
  const ingresos7d = Number(ingresosUltimos7d._sum.total ?? 0)
  const ingresosPrev7d = Number(ingresosPrevios7d._sum.total ?? 0)
  const variacionIngresos =
    ingresosPrev7d > 0
      ? ((ingresos7d - ingresosPrev7d) / ingresosPrev7d) * 100
      : ingresos7d > 0
        ? 100
        : 0

  const totalContactos30d = contactosNoLeidos + contactosLeidos

  const stats = [
    {
      label: "Pedidos hoy",
      value: pedidosHoy,
      icon: Package,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Turnos pendientes",
      value: turnosPendientes,
      icon: CalendarClock,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Leads nuevos (semana)",
      value: leadsNuevos,
      icon: Users,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Ventas del mes",
      value: formatPrice(ventasMes._sum.total ?? 0),
      icon: DollarSign,
      color: "text-[#6B4F7A] bg-purple-50",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Resumen general de Motos Fernandez
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pedidos recientes</CardTitle>
              <Link
                href="/admin/pedidos"
                className="text-sm text-[#6B4F7A] hover:underline"
              >
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No hay pedidos aun
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((pedido) => {
                  const estadoInfo = ESTADO_PEDIDO_LABELS[pedido.estado]
                  return (
                    <Link
                      key={pedido.id}
                      href={`/admin/pedidos/${pedido.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          #{pedido.numero} - {pedido.nombre} {pedido.apellido}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {pedido.items.length} item(s) -{" "}
                          {pedido.createdAt.toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatPrice(pedido.total)}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${estadoInfo?.color || ""}`}
                        >
                          {estadoInfo?.label || pedido.estado}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads sin contactar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Leads sin contactar</CardTitle>
              <Link
                href="/admin/crm"
                className="text-sm text-[#6B4F7A] hover:underline"
              >
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {leadsSinContactar.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No hay leads nuevos
              </p>
            ) : (
              <div className="space-y-3">
                {leadsSinContactar.map((lead) => {
                  const tempInfo = TEMPERATURA_LABELS[lead.temperatura]
                  return (
                    <Link
                      key={lead.id}
                      href={`/admin/crm/${lead.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {lead.nombre} {lead.apellido || ""}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lead.telefono || lead.email || "Sin contacto"} -{" "}
                          {lead.modelo?.nombre || lead.modeloInteres || "Sin modelo"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${tempInfo?.color || ""}`}
                        >
                          {tempInfo?.label}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {lead.createdAt.toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ventas por mes - CSS bar chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ventas por mes</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ultimos 6 meses (pedidos confirmados)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ventasPorMes.map((v) => {
                const pct = maxVentas > 0 ? Math.round((v.total / maxVentas) * 100) : 0
                return (
                  <div key={v.key} className="flex items-center gap-3">
                    {/* Month label */}
                    <span className="w-8 text-xs font-medium text-gray-600 dark:text-gray-300 shrink-0">
                      {v.mes}
                    </span>
                    {/* Bar container */}
                    <div className="flex-1 h-7 bg-gray-100 dark:bg-neutral-800 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                        style={{
                          width: pct > 0 ? `${Math.max(pct, 4)}%` : "0%",
                          backgroundColor: "#6B4F7A",
                        }}
                      >
                        {pct >= 25 && (
                          <span className="text-[10px] text-white font-medium truncate">
                            {formatPrice(v.total)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Amount outside bar when bar is short */}
                    <span className="w-24 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                      {v.total > 0 ? formatPrice(v.total) : <span className="text-gray-400">—</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Leads por origen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leads por origen</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total: {totalLeads} lead{totalLeads !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            {leadsPorOrigen.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No hay leads registrados
              </p>
            ) : (
              <div className="space-y-4">
                {/* Pills row */}
                <div className="flex flex-wrap gap-2">
                  {leadsPorOrigen.map((l) => {
                    const color = ORIGEN_COLORS[l.origen] ?? "bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-100"
                    const label = ORIGEN_LABELS[l.origen]?.label ?? l.origen
                    return (
                      <span
                        key={l.origen}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${color}`}
                      >
                        {label}
                        <span className="rounded-full bg-white/60 dark:bg-neutral-900/60 px-1.5 py-0.5 text-xs font-bold">
                          {l.cantidad}
                        </span>
                      </span>
                    )
                  })}
                </div>

                {/* Horizontal bar breakdown */}
                <div className="space-y-2 pt-1">
                  {leadsPorOrigen.map((l) => {
                    const pct = totalLeads > 0 ? Math.round((l.cantidad / totalLeads) * 100) : 0
                    const barColor = ORIGEN_BAR_COLOR[l.origen] ?? "bg-gray-400"
                    const label = ORIGEN_LABELS[l.origen]?.label ?? l.origen
                    return (
                      <div key={l.origen} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-gray-600 dark:text-gray-300 truncate shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-gray-500 dark:text-gray-400 shrink-0">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Visitas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-[#6B4F7A]" />
          Visitas al sitio
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B4F7A] bg-purple-50">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{visitasHoy}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Visitas hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B4F7A] bg-purple-50">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{visitasSemana}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Visitas esta semana</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Páginas más visitadas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Páginas más visitadas</CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 7 días</p>
            </CardHeader>
            <CardContent>
              {visitasPorPagina.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  Sin datos aún
                </p>
              ) : (
                <div className="space-y-2">
                  {visitasPorPagina.map((v) => {
                    const maxCount = visitasPorPagina[0]._count.pagina
                    const pct = maxCount > 0 ? Math.round((v._count.pagina / maxCount) * 100) : 0
                    return (
                      <div key={v.pagina} className="flex items-center gap-3">
                        <span className="w-28 text-xs text-gray-600 dark:text-gray-300 truncate shrink-0">{v.pagina}</span>
                        <div className="flex-1 h-6 bg-gray-100 dark:bg-neutral-800 rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md flex items-center px-2"
                            style={{
                              width: `${Math.max(pct, 4)}%`,
                              backgroundColor: "#6B4F7A",
                            }}
                          >
                            {pct >= 30 && (
                              <span className="text-[10px] text-white font-medium">
                                {v._count.pagina}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                          {v._count.pagina}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ciudades top */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#6B4F7A]" />
                Ciudades de origen
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Últimos 7 días</p>
            </CardHeader>
            <CardContent>
              {ciudades.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  Sin datos de ubicación aún (requiere Vercel)
                </p>
              ) : (
                <div className="space-y-3">
                  {ciudades.map((c) => (
                    <div key={c.ciudad} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{c.ciudad}</span>
                      <Badge variant="secondary" className="text-xs bg-purple-50 text-[#6B4F7A]">
                        {c._count.ciudad} visita{c._count.ciudad !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métricas de conversión y engagement */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#6B4F7A]" />
          Conversión y engagement
        </h2>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Conversiones del chatbot */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-indigo-600 bg-indigo-50">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversionesChat}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Conversiones chatbot (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consultas por formulario */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-amber-600 bg-amber-50">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {totalContactos30d}
                    {contactosNoLeidos > 0 && (
                      <span className="ml-2 text-xs font-semibold text-amber-600">
                        {contactosNoLeidos} sin leer
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Consultas formulario (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasa de conversión */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-emerald-600 bg-emerald-50">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {visitasTienda30d > 0 ? `${tasaConversion.toFixed(2)}%` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tasa conversión tienda (30d)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingresos 7d vs previos */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-[#6B4F7A] bg-purple-50">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold truncate">
                    {ingresos7d > 0 ? formatPrice(ingresos7d) : "—"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    Ingresos 7d
                    {ingresosPrev7d > 0 || ingresos7d > 0 ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold ${
                          variacionIngresos > 0
                            ? "text-green-600"
                            : variacionIngresos < 0
                              ? "text-red-600"
                              : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {variacionIngresos > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : variacionIngresos < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {Math.abs(variacionIngresos).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">sin datos</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rankings de productos y modelos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos más vistos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#6B4F7A]" />
                Productos más vistos
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top 5 - últimos 30 días</p>
            </CardHeader>
            <CardContent>
              {productosMasVistos.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {productosMasVistos.map((p, idx) => {
                    const maxCount = productosMasVistos[0].cantidad
                    const pct = maxCount > 0 ? Math.round((p.cantidad / maxCount) * 100) : 0
                    return (
                      <div key={p.pagina} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-semibold text-gray-400 shrink-0">
                          {idx + 1}.
                        </span>
                        <Link
                          href={p.pagina}
                          className="w-32 text-xs text-gray-700 dark:text-gray-300 truncate shrink-0 hover:text-[#6B4F7A] hover:underline"
                          title={p.slug}
                        >
                          {p.slug}
                        </Link>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-neutral-800 rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md"
                            style={{
                              width: `${Math.max(pct, 4)}%`,
                              backgroundColor: "#6B4F7A",
                            }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                          {p.cantidad}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modelos más consultados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bike className="h-4 w-4 text-[#6B4F7A]" />
                Modelos más consultados
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top 5 - últimos 30 días</p>
            </CardHeader>
            <CardContent>
              {modelosMasVistos.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {modelosMasVistos.map((m, idx) => {
                    const maxCount = modelosMasVistos[0].cantidad
                    const pct = maxCount > 0 ? Math.round((m.cantidad / maxCount) * 100) : 0
                    return (
                      <div key={m.pagina} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-semibold text-gray-400 shrink-0">
                          {idx + 1}.
                        </span>
                        <Link
                          href={m.pagina}
                          className="w-32 text-xs text-gray-700 dark:text-gray-300 truncate shrink-0 hover:text-[#6B4F7A] hover:underline"
                          title={m.slug}
                        >
                          {m.slug}
                        </Link>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-neutral-800 rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md"
                            style={{
                              width: `${Math.max(pct, 4)}%`,
                              backgroundColor: "#6B4F7A",
                            }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                          {m.cantidad}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

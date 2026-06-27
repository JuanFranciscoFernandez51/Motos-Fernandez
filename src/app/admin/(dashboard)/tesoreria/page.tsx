import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wallet,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import {
  formatDate,
  formatMoney,
  formatNumero,
  diasHasta,
  ESTADO_FINANCIACION_STYLES,
  ESTADO_FINANCIACION_LABELS,
} from "@/lib/admin-helpers"
import { actualizarEstadosVencidos } from "@/lib/financiacion-helpers"

export const dynamic = "force-dynamic"

export default async function TesoreriaPage() {
  // Sincronizar estados antes de mostrar
  await actualizarEstadosVencidos(prisma)

  // Stats por moneda
  const financiaciones = await prisma.financiacionOC.findMany({
    include: {
      cliente: { select: { nombre: true, apellido: true } },
      cuotas: {
        select: { id: true, estado: true, monto: true, fechaVencimiento: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Stats globales
  const stats = {
    activas: financiaciones.filter((f) => f.estado === "ACTIVA").length,
    atrasadas: financiaciones.filter((f) => f.estado === "ATRASADA").length,
    completadas: financiaciones.filter((f) => f.estado === "COMPLETADA").length,
    total: financiaciones.length,
  }

  // Saldo pendiente por moneda
  const saldoARS = financiaciones
    .filter((f) => f.moneda === "ARS" && (f.estado === "ACTIVA" || f.estado === "ATRASADA"))
    .reduce((acc, f) => {
      const pendiente = f.cuotas
        .filter((c) => c.estado === "PENDIENTE" || c.estado === "ATRASADA")
        .reduce((s, c) => s + c.monto, 0)
      return acc + pendiente
    }, 0)

  const saldoUSD = financiaciones
    .filter((f) => f.moneda === "USD" && (f.estado === "ACTIVA" || f.estado === "ATRASADA"))
    .reduce((acc, f) => {
      const pendiente = f.cuotas
        .filter((c) => c.estado === "PENDIENTE" || c.estado === "ATRASADA")
        .reduce((s, c) => s + c.monto, 0)
      return acc + pendiente
    }, 0)

  // Cuotas próximas a vencer (próximos 7 días) y atrasadas
  const cuotasAlerta = await prisma.cuotaFinanciacion.findMany({
    where: {
      estado: { in: ["PENDIENTE", "ATRASADA"] },
      fechaVencimiento: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // hasta 7 días
      },
    },
    include: {
      financiacion: {
        include: {
          cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
        },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
    take: 30,
  })

  // Cobrado este mes (cuotas pagadas en el mes actual)
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const cuotasCobradasMes = await prisma.cuotaFinanciacion.findMany({
    where: {
      estado: "PAGADA",
      fechaPago: { gte: inicioMes },
    },
    include: {
      financiacion: { select: { moneda: true } },
    },
  })
  const cobradoMesARS = cuotasCobradasMes
    .filter((c) => c.financiacion.moneda === "ARS")
    .reduce((s, c) => s + c.monto, 0)
  const cobradoMesUSD = cuotasCobradasMes
    .filter((c) => c.financiacion.moneda === "USD")
    .reduce((s, c) => s + c.monto, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tesorería</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Seguimiento de pagos, financiaciones y cobranzas.
        </p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Financiaciones activas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activas}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.atrasadas > 0 ? "border-red-300 dark:border-red-900/40" : ""}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-full flex items-center justify-center ${
                stats.atrasadas > 0
                  ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                  : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400"
              }`}>
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Atrasadas</p>
                <p className={`text-2xl font-bold ${stats.atrasadas > 0 ? "text-red-700 dark:text-red-300" : "text-gray-900 dark:text-gray-100"}`}>
                  {stats.atrasadas}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-300">
                <CheckCircle className="size-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Completadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.completadas}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-300">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saldos pendientes y cobrado este mes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="size-4 text-[#7C3AED]" />
              Saldo pendiente de cobro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Pesos (ARS)</span>
              <span className="text-xl font-bold text-[#7C3AED]">
                {formatMoney(saldoARS, "ARS")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Dólares (USD)</span>
              <span className="text-xl font-bold text-[#7C3AED]">
                {formatMoney(saldoUSD, "USD")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-green-600 dark:text-green-300" />
              Cobrado este mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Pesos (ARS)</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatMoney(cobradoMesARS, "ARS")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Dólares (USD)</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-300">
                {formatMoney(cobradoMesUSD, "USD")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de cuotas próximas a vencer / atrasadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-amber-600 dark:text-amber-300" />
              Cuotas a vencer (próximos 7 días) y atrasadas
            </span>
            <Link
              href="/admin/tesoreria/financiaciones"
              className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cuotasAlerta.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="size-10 mx-auto text-green-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ¡Todo al día! No hay cuotas próximas a vencer ni atrasadas.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
              {cuotasAlerta.map((c) => {
                const dias = diasHasta(c.fechaVencimiento)
                const isAtrasada = c.estado === "ATRASADA" || dias < 0
                return (
                  <li key={c.id}>
                    <Link
                      href={`/admin/tesoreria/financiaciones/${c.financiacion.id}`}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 dark:hover:bg-neutral-900 -mx-1 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          isAtrasada
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        }`}>
                          #{c.numero}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {c.financiacion.cliente.apellido}, {c.financiacion.cliente.nombre}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatNumero("FIN", c.financiacion.numero)} · {c.financiacion.descripcion}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatMoney(c.monto, c.financiacion.moneda)}
                        </p>
                        <p className={`text-xs ${
                          isAtrasada
                            ? "text-red-600 dark:text-red-300 font-semibold"
                            : dias <= 2
                              ? "text-amber-600 dark:text-amber-300 font-semibold"
                              : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {isAtrasada
                            ? `Atrasada ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`
                            : dias === 0
                              ? "Vence hoy"
                              : dias === 1
                                ? "Vence mañana"
                                : `Vence en ${dias} días`}
                          {" · "}
                          {formatDate(c.fechaVencimiento)}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Últimas financiaciones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Últimas financiaciones</span>
            <Link
              href="/admin/tesoreria/financiaciones"
              className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {financiaciones.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              Todavía no hay financiaciones. Se crean automáticamente cuando una OC tiene cuotas.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
              {financiaciones.slice(0, 5).map((f) => {
                const cuotasPagadas = f.cuotas.filter((c) => c.estado === "PAGADA").length
                return (
                  <li key={f.id}>
                    <Link
                      href={`/admin/tesoreria/financiaciones/${f.id}`}
                      className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 dark:hover:bg-neutral-900 -mx-1 rounded"
                    >
                      <div>
                        <p className="font-mono text-xs text-[#7C3AED]">
                          {formatNumero("FIN", f.numero)}
                        </p>
                        <p className="font-medium text-sm">
                          {f.cliente.apellido}, {f.cliente.nombre}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {f.descripcion} · {cuotasPagadas}/{f.cantidadCuotas} cuotas pagadas
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="secondary"
                          className={ESTADO_FINANCIACION_STYLES[f.estado]}
                        >
                          {ESTADO_FINANCIACION_LABELS[f.estado]}
                        </Badge>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatMoney(f.montoTotal, f.moneda)}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

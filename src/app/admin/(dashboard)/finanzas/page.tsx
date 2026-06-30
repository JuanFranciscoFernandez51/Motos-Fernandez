import Link from "next/link"
import { TrendingUp, Wallet, Clock, Package, DollarSign, ArrowRight, AlertTriangle, Target, Bike, Gauge } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { getPosicionTotal, getResumenCuentasCheques } from "@/lib/finanzas-data"
import { getMargenPromedioReal } from "@/lib/margen-helpers"
import { calcularMetricasCostosFijos } from "@/lib/finanzas"
import { prisma } from "@/lib/prisma"
import { formatMoney, formatDate } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

export default async function FinanzasPage() {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const [pos, cyc, margenReal, config, costos, vendidasMes] = await Promise.all([
    getPosicionTotal(),
    getResumenCuentasCheques(),
    getMargenPromedioReal(prisma),
    prisma.finanzasConfig.findFirst(),
    prisma.costoFijo.findMany(),
    prisma.ordenCompra.count({ where: { estado: "CONCRETADA", fecha: { gte: inicioMes } } }),
  ])

  // Breakeven calculado con el MARGEN REAL (si hay ventas cargadas); si no,
  // cae al margen configurado a mano.
  const margenUsado = margenReal.promedio > 0 ? margenReal.promedio : (config?.margenBrutoMoto || 1)
  const metr = calcularMetricasCostosFijos(costos, {
    motosEstimadasMes: config?.motosEstimadasMes || 1,
    margenBrutoMoto: margenUsado,
  })
  const faltanParaCubrir = Math.max(0, metr.motosMinimas - vendidasMes)

  const kpis = [
    { label: "Posición total", valor: pos.posicionTotal, icon: TrendingUp, color: "#7C3AED", hint: "Saldos + por cobrar + stock" },
    { label: "En cuentas (ARS)", valor: pos.totalEnCuentasARS, icon: Wallet, color: "#9D5CF0", hint: "Plata disponible en cuentas" },
    { label: "Por cobrar", valor: pos.porCobrar.total, icon: Clock, color: "#CE9F33", hint: `${pos.porCobrar.cantidad} cuentas pendientes` },
    { label: "Valor de stock", valor: pos.valorStock.valorTotal, icon: Package, color: "#7C8B9A", hint: `${pos.valorStock.unidadesMotos} motos + ${pos.valorStock.unidadesProductos} prod.` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Seguimiento de cuentas, resultados y posición — en vivo.</p>
      </div>

      <FinanzasNav />

      {/* Banda de RENTABILIDAD — breakeven con margen real, bien arriba */}
      <div className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/[0.06] to-transparent p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-[#7C3AED]" />
          <h2 className="text-sm font-semibold text-gray-800">Rentabilidad del mes</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Margen bruto x moto</span>
              <TrendingUp className="h-4 w-4 text-[#7C3AED]" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">{formatMoney(margenReal.promedio)}</div>
            <div className="text-[11px] text-gray-400 mt-1">
              {margenReal.cantidad > 0 ? `promedio real de ${margenReal.cantidad} venta${margenReal.cantidad === 1 ? "" : "s"}` : "sin ventas con costo cargado aún"}
            </div>
          </div>

          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Costo fijo mensual</span>
              <Wallet className="h-4 w-4 text-[#9D5CF0]" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">{formatMoney(metr.totalMensual)}</div>
            <div className="text-[11px] text-gray-400 mt-1">{formatMoney(Math.round(metr.costoPorDia))} por día</div>
          </div>

          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Breakeven</span>
              <Target className="h-4 w-4 text-[#CE9F33]" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">{metr.motosMinimas.toFixed(1)} <span className="text-sm font-medium text-gray-400">motos/mes</span></div>
            <div className="text-[11px] text-gray-400 mt-1">
              para cubrir costos {margenReal.promedio > 0 ? "(con margen real)" : "(margen estimado)"}
            </div>
          </div>

          <div className="rounded-xl bg-white border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Vendidas este mes</span>
              <Bike className="h-4 w-4 text-[#7C8B9A]" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">{vendidasMes}</div>
            <div className="text-[11px] mt-1">
              {faltanParaCubrir <= 0 ? (
                <span className="text-emerald-600 font-semibold">✓ costos fijos cubiertos</span>
              ) : (
                <span className="text-gray-400">faltan <strong className="text-[#CE9F33]">{faltanParaCubrir.toFixed(1)}</strong> para el breakeven</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{k.label}</span>
                <k.icon className="h-4 w-4" style={{ color: k.color }} />
              </div>
              <div className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">{formatMoney(k.valor)}</div>
              <div className="text-[11px] text-gray-400 mt-1">{k.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pos.porCobrar.vencido > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Tenés <strong>{formatMoney(pos.porCobrar.vencido)}</strong> vencido por cobrar.
        </div>
      )}

      {/* Saldos por cuenta (ARS izquierda, USD/Papá derecha) — arriba */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Saldos ARS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Saldos por cuenta (ARS)</CardTitle>
            <Link href="/admin/finanzas/cuentas" className="text-xs text-[#7C3AED] hover:underline inline-flex items-center gap-1">
              Editar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {pos.saldosARS.map((s) => (
              <div key={s.cuenta.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-700">{s.cuenta.nombre}</span>
                <span className={`tabular-nums font-medium ${s.saldoActual < 0 ? "text-red-600" : "text-gray-900"}`}>
                  {formatMoney(s.saldoActual)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 font-bold">
              <span>Total en cuentas</span>
              <span className="tabular-nums" style={{ color: "#7C3AED" }}>{formatMoney(pos.totalEnCuentasARS)}</span>
            </div>
          </CardContent>
        </Card>

        {/* USD + Papá */}
        <div className="space-y-6">
          {pos.saldosUSD.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base">Saldos en USD</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {pos.saldosUSD.map((s) => (
                  <div key={s.cuenta.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
                    <span className="text-gray-700">{s.cuenta.nombre}</span>
                    <span className="tabular-nums font-medium">{formatMoney(s.saldoActual, "USD")}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 font-bold">
                  <span>Total USD</span>
                  <span className="tabular-nums text-emerald-700">{formatMoney(pos.totalEnCuentasUSD, "USD")}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {pos.cuentaPapa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cuenta corriente — Papá</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {pos.cuentaPapa.map((s) => (
                  <div key={s.cuenta.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-700">{s.cuenta.nombre} <span className="text-[11px] text-gray-400">(excluida de resultados)</span></span>
                    <span className="tabular-nums font-medium">{formatMoney(s.saldoActual, s.cuenta.moneda)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Valor de stock + Por cobrar — abajo de los saldos */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Valor de stock por categoría</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {pos.valorStock.desglose.map((d) => (
              <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-700">{d.label} <span className="text-[11px] text-gray-400">· {d.unidades} u.</span></span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 tabular-nums">{d.pct.toFixed(0)}%</span>
                  <span className="tabular-nums font-medium text-gray-900">{formatMoney(d.valor)}</span>
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 font-bold">
              <span>Total stock <span className="text-[11px] font-normal text-gray-400">(nuestro)</span></span>
              <span className="tabular-nums" style={{ color: "#7C3AED" }}>{formatMoney(pos.valorStock.valorTotal)}</span>
            </div>
            {/* Consignación: motos de terceros en el local. NO es activo nuestro. */}
            {pos.valorStock.unidadesConsignacion > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 text-sm">
                <span className="text-amber-800 dark:text-amber-300">
                  En consignación <span className="text-[11px] text-amber-600 dark:text-amber-400">· {pos.valorStock.unidadesConsignacion} u. · no es tuyo</span>
                </span>
                <span className="tabular-nums font-medium text-amber-800 dark:text-amber-300">{formatMoney(pos.valorStock.valorConsignacion)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cuentas y cheques</CardTitle>
            <Link href="/admin/finanzas/cuentas-y-cheques" className="text-xs text-[#7C3AED] hover:underline inline-flex items-center gap-1">Ver todo <ArrowRight className="h-3 w-3" /></Link>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-700">A cobrar</span>
              <span className="tabular-nums font-medium" style={{ color: "#CE9F33" }}>{formatMoney(cyc.aCobrar)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-700">A pagar</span>
              <span className="tabular-nums font-medium text-red-700">{formatMoney(cyc.aPagar)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 font-bold">
              <span>Posición neta</span>
              <span className={`tabular-nums ${cyc.neto >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatMoney(cyc.neto)}</span>
            </div>
            <p className="text-[11px] text-gray-400 -mt-0.5">{cyc.neto >= 0 ? "Te queda a favor" : "Te queda en contra"} (cuentas + cheques)</p>
            {cyc.items.length > 0 && (
              <div className="pt-3 mt-1 border-t border-gray-100 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Próximos vencimientos</p>
                {cyc.items.slice(0, 5).map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 truncate max-w-[58%]">
                      <span className={i.dir === "cobrar" ? "text-[#CE9F33]" : "text-red-600"}>{i.dir === "cobrar" ? "▲" : "▼"}</span>{" "}
                      {i.label} <span className="text-gray-400">· {i.sub}</span>
                      {i.vencido && <span className="text-red-500"> · vencido</span>}
                    </span>
                    <span className="text-gray-500">
                      {i.venc ? formatDate(i.venc) : "—"} · <span className="tabular-nums font-medium text-gray-700">{formatMoney(i.monto, i.moneda)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

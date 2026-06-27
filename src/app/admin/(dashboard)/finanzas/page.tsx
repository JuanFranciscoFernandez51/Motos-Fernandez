import Link from "next/link"
import { TrendingUp, Wallet, Clock, Package, DollarSign, ArrowRight, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { getPosicionTotal, getResumenCuentasCheques } from "@/lib/finanzas-data"
import { formatMoney, formatDate } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"

export default async function FinanzasPage() {
  const [pos, cyc] = await Promise.all([getPosicionTotal(), getResumenCuentasCheques()])

  const kpis = [
    { label: "Posición total", valor: pos.posicionTotal, icon: TrendingUp, color: "#3A8B96", hint: "Saldos + por cobrar + stock" },
    { label: "En cuentas (ARS)", valor: pos.totalEnCuentasARS, icon: Wallet, color: "#5BB5C2", hint: "Plata disponible en cuentas" },
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
            <Link href="/admin/finanzas/cuentas" className="text-xs text-[#3A8B96] hover:underline inline-flex items-center gap-1">
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
              <span className="tabular-nums" style={{ color: "#3A8B96" }}>{formatMoney(pos.totalEnCuentasARS)}</span>
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
              <span>Total stock</span>
              <span className="tabular-nums" style={{ color: "#3A8B96" }}>{formatMoney(pos.valorStock.valorTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cuentas y cheques</CardTitle>
            <Link href="/admin/finanzas/cuentas-y-cheques" className="text-xs text-[#3A8B96] hover:underline inline-flex items-center gap-1">Ver todo <ArrowRight className="h-3 w-3" /></Link>
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

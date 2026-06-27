import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { PeriodoSelector } from "@/components/admin/finanzas/periodo-selector"
import { calcularDashboardAnual, MESES_CORTOS } from "@/lib/finanzas"
import { getUnidadesVendidasPorModelo, getCategorias } from "@/lib/finanzas-data"
import { Card, CardContent } from "@/components/ui/card"
import { GraficoAnual } from "@/components/admin/finanzas/grafico-anual"
import { Download } from "lucide-react"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  if (n === 0) return "—"
  const abs = Math.abs(n)
  const s = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)}M` : abs >= 1000 ? `${Math.round(abs / 1000)}k` : String(abs)
  return n < 0 ? `-${s}` : s
}
function fmtFull(n: number) {
  return `$ ${n.toLocaleString("es-AR")}`
}

export default async function DashboardAnualPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>
}) {
  const sp = await searchParams
  const anio = sp.anio != null ? Number(sp.anio) : new Date().getFullYear()

  const [movimientos, unidades, cuentasCxc, categorias] = await Promise.all([
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } },
      include: { cuenta: true },
    }),
    getUnidadesVendidasPorModelo(anio),
    prisma.cuentaPorCobrar.findMany({ where: { estado: "PENDIENTE", moneda: "ARS" }, select: { sentido: true, monto: true } }),
    getCategorias(),
  ])

  const d = calcularDashboardAnual(JSON.parse(JSON.stringify(movimientos)), anio, categorias.ingreso, categorias.gasto)
  const totalUnidades = MESES_CORTOS.map((_, mi) => unidades.reduce((a, u) => a + u.meses[mi], 0))

  // Posición de créditos/deudas pendiente (snapshot actual, informativo)
  const porCobrarPend = cuentasCxc.filter((c) => c.sentido === "COBRAR").reduce((a, c) => a + c.monto, 0)
  const porPagarPend = cuentasCxc.filter((c) => c.sentido === "PAGAR").reduce((a, c) => a + c.monto, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-500">Evolución mensual del año {anio}.</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodoSelector base="/admin/finanzas/anual" anio={anio} conMes={false} />
          <a
            href={`/api/admin/finanzas/export/anual?anio=${anio}`}
            className="inline-flex items-center gap-1.5 h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
            title="Descargar Excel del año (para el contador)"
          >
            <Download className="h-4 w-4" /> Excel
          </a>
        </div>
      </div>
      <FinanzasNav />

      {/* KPIs anuales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Ingresos del año" valor={d.totalIngresosAnual} color="text-emerald-700" />
        <Kpi label="Gastos del año" valor={d.totalGastosAnual} color="text-red-700" />
        <Kpi label="Resultado del año" valor={d.resultadoAnual} color={d.resultadoAnual >= 0 ? "text-gray-900" : "text-red-700"} />
        <Kpi label="Motos vendidas" valorTexto={String(totalUnidades.reduce((a, b) => a + b, 0))} color="text-gray-900" />
      </div>

      {/* Gráfico ingresos vs gastos + resultado */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Ingresos, gastos y resultado por mes</h2>
          <GraficoAnual ingresos={d.totalIngresosMes} gastos={d.totalGastosMes} resultado={d.resultadoMes} />
        </CardContent>
      </Card>

      {/* Matriz */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-semibold px-3 py-2 sticky left-0 bg-gray-50 min-w-[180px]">Concepto</th>
              {MESES_CORTOS.map((m) => <th key={m} className="text-right font-semibold px-2 py-2 min-w-[58px]">{m}</th>)}
              <th className="text-right font-bold px-3 py-2 bg-gray-100 min-w-[80px]">Total</th>
            </tr>
          </thead>
          <tbody>
            <SeccionHeader label="INGRESOS" />
            {d.ingresos.map((f) => <FilaDatos key={f.categoria} fila={f} />)}
            <FilaTotal label="Total ingresos" meses={d.totalIngresosMes} total={d.totalIngresosAnual} color="text-emerald-700" />

            <SeccionHeader label="GASTOS" />
            {d.gastos.map((f) => <FilaDatos key={f.categoria} fila={f} />)}
            <FilaTotal label="Total gastos" meses={d.totalGastosMes} total={d.totalGastosAnual} color="text-red-700" />

            <FilaTotal label="RESULTADO" meses={d.resultadoMes} total={d.resultadoAnual} color="text-gray-900" fuerte />
            <FilaTotal label="Acumulado" meses={d.resultadoAcumulado} total={d.resultadoAcumulado[11]} color="text-[#7C3AED]" />
            <tr className="border-t border-gray-100">
              <td className="px-3 py-1.5 sticky left-0 bg-white text-gray-500 italic">Margen %</td>
              {d.margenMes.map((m, i) => (
                <td key={i} className={`px-2 py-1.5 text-right tabular-nums ${m < 0 ? "text-red-500" : "text-gray-500"}`}>{m !== 0 ? `${m.toFixed(0)}%` : "—"}</td>
              ))}
              <td className="px-3 py-1.5 text-right tabular-nums font-semibold bg-gray-50 text-gray-600">
                {d.totalIngresosAnual > 0 ? `${((d.resultadoAnual / d.totalIngresosAnual) * 100).toFixed(0)}%` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Unidades vendidas por modelo */}
      {unidades.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-semibold px-3 py-2 sticky left-0 bg-gray-50 min-w-[180px]">Unidades vendidas</th>
                  {MESES_CORTOS.map((m) => <th key={m} className="text-right font-semibold px-2 py-2 min-w-[44px]">{m}</th>)}
                  <th className="text-right font-bold px-3 py-2 bg-gray-100">Total</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((u) => (
                  <tr key={u.modelo} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 sticky left-0 bg-white text-gray-700">{u.modelo}</td>
                    {u.meses.map((v, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums text-gray-600">{v || "—"}</td>)}
                    <td className="px-3 py-1.5 text-right tabular-nums font-bold bg-gray-50">{u.total}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="px-3 py-1.5 sticky left-0 bg-white">Total unidades</td>
                  {totalUnidades.map((v, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums">{v || "—"}</td>)}
                  <td className="px-3 py-1.5 text-right tabular-nums bg-gray-50">{totalUnidades.reduce((a, b) => a + b, 0)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {(porCobrarPend > 0 || porPagarPend > 0) && (
        <Card>
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Por cobrar (pendiente)</div>
              <div className="text-xl font-bold tabular-nums" style={{ color: "#CE9F33" }}>{fmtFull(porCobrarPend)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Por pagar (pendiente)</div>
              <div className="text-xl font-bold tabular-nums text-red-700">{fmtFull(porPagarPend)}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Posición neta</div>
              <div className={`text-xl font-bold tabular-nums ${porCobrarPend - porPagarPend >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmtFull(porCobrarPend - porPagarPend)}</div>
            </div>
            <p className="sm:col-span-3 text-[11px] text-gray-400">Snapshot actual de créditos y deudas (no entra en el resultado anual de caja).</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-gray-400">Los montos de la matriz están abreviados (k = mil, M = millón). Las unidades vendidas se cuentan desde Stock Motos.</p>
    </div>
  )

  function Kpi({ label, valor, valorTexto, color }: { label: string; valor?: number; valorTexto?: string; color: string }) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
          <div className={`text-xl md:text-2xl font-bold tabular-nums ${color}`}>{valorTexto ?? fmtFull(valor ?? 0)}</div>
        </CardContent>
      </Card>
    )
  }
}

function SeccionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-gray-100/70">
      <td colSpan={14} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 sticky left-0 bg-gray-100/70">{label}</td>
    </tr>
  )
}

function FilaDatos({ fila }: { fila: { categoria: string; meses: number[]; total: number } }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50">
      <td className="px-3 py-1.5 sticky left-0 bg-white text-gray-700">{fila.categoria}</td>
      {fila.meses.map((v, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums text-gray-500">{fmt(v)}</td>)}
      <td className="px-3 py-1.5 text-right tabular-nums font-semibold bg-gray-50 text-gray-800">{fmt(fila.total)}</td>
    </tr>
  )
}

function FilaTotal({
  label, meses, total, color, fuerte,
}: {
  label: string; meses: number[]; total: number; color: string; fuerte?: boolean
}) {
  return (
    <tr className={`border-t ${fuerte ? "border-gray-300 bg-gray-50" : "border-gray-200"}`}>
      <td className={`px-3 py-1.5 sticky left-0 ${fuerte ? "bg-gray-50" : "bg-white"} font-bold ${color}`}>{label}</td>
      {meses.map((v, i) => <td key={i} className={`px-2 py-1.5 text-right tabular-nums font-semibold ${v < 0 ? "text-red-600" : color}`}>{fmt(v)}</td>)}
      <td className={`px-3 py-1.5 text-right tabular-nums font-bold bg-gray-100 ${total < 0 ? "text-red-600" : color}`}>{fmt(total)}</td>
    </tr>
  )
}

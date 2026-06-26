import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/admin-helpers"
import { getResumenMes, getNetoPorCuentaMes } from "@/lib/finanzas-data"
import { FinanzasNav } from "../finanzas-nav"
import { MesSelector } from "../periodo-selector"

export const dynamic = "force-dynamic"
const BASE = "/admin/tesoreria/finanzas/mensual"

export default async function ResumenMensualPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const ar = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const mesStr = sp.mes || `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, "0")}`
  const [anio, mes] = mesStr.split("-").map((n) => parseInt(n, 10))

  const [resumen, netoCuentas] = await Promise.all([
    getResumenMes(anio, mes),
    getNetoPorCuentaMes(anio, mes),
  ])
  const { ars, usd, ingresosCategorias, gastosCategorias } = resumen

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <div className="flex items-center gap-2">
          <a href={`/api/admin/finanzas/export?tipo=mensual&mes=${mesStr}`} className="rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800" title="Solo movimientos registrados (blanco)">Excel contador</a>
          <a href={`/api/admin/finanzas/export?tipo=mensual&mes=${mesStr}&incluirNegro=1`} className="rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800" title="Incluye todo (blanco + negro)">Excel completo</a>
          <MesSelector mes={mesStr} basePath={BASE} />
        </div>
      </div>
      <FinanzasNav />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Ingresos" value={formatMoney(ars.ingresos, "ARS")} sub={`Blanco ${formatMoney(ars.blanco.ingresos, "ARS")}`} cls="text-green-700 dark:text-green-300" />
        <Kpi label="Gastos" value={formatMoney(ars.gastos, "ARS")} sub={`Blanco ${formatMoney(ars.blanco.gastos, "ARS")}`} cls="text-red-700 dark:text-red-300" />
        <Kpi label="Resultado" value={formatMoney(ars.resultado, "ARS")} sub={`Margen ${ars.margen.toFixed(1)}%`} cls={ars.resultado >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"} />
        <Kpi label="En negro (result.)" value={formatMoney(ars.negro.resultado, "ARS")} sub={`Blanco ${formatMoney(ars.blanco.resultado, "ARS")}`} cls="text-gray-700 dark:text-gray-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoriaTabla titulo="Ingresos por categoría" cats={ingresosCategorias} total={ars.ingresos} />
        <CategoriaTabla titulo="Gastos por categoría" cats={gastosCategorias} total={ars.gastos} />
      </div>

      {/* USD aparte */}
      {(usd.ingresos > 0 || usd.gastos > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Movimientos en USD</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <span>Ingresos: <strong>{formatMoney(usd.ingresos, "USD")}</strong></span>
            <span>Gastos: <strong>{formatMoney(usd.gastos, "USD")}</strong></span>
            <span>Resultado: <strong>{formatMoney(usd.resultado, "USD")}</strong></span>
          </CardContent>
        </Card>
      )}

      {/* Neto por cuenta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Movimiento neto por cuenta (este mes)</CardTitle></CardHeader>
        <CardContent>
          {netoCuentas.length === 0 ? (
            <p className="text-sm text-gray-400">Sin movimientos en el mes.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {netoCuentas.map((c) => (
                <div key={c.nombre} className="rounded-lg border border-gray-100 dark:border-neutral-800 p-3">
                  <p className="text-xs text-gray-500">{c.nombre}</p>
                  <p className={`font-bold ${c.neto < 0 ? "text-red-600 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
                    {c.neto < 0 ? "- " : "+ "}{formatMoney(Math.abs(c.neto), c.moneda)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ label, value, sub, cls }: { label: string; value: string; sub: string; cls: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-xl font-bold ${cls}`}>{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

function CategoriaTabla({ titulo, cats, total }: { titulo: string; cats: { nombre: string; total: number; blanco: number }[]; total: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent>
        {cats.length === 0 ? (
          <p className="text-sm text-gray-400">Sin movimientos.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {cats.map((c) => {
                const pct = total > 0 ? (c.total / total) * 100 : 0
                return (
                  <tr key={c.nombre} className="border-t border-gray-50 dark:border-neutral-900">
                    <td className="py-1.5">
                      {c.nombre}
                      <div className="h-1 mt-1 rounded bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                        <div className="h-full bg-[#6B4F7A]" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-medium whitespace-nowrap pl-3">{formatMoney(c.total, "ARS")}</td>
                    <td className="py-1.5 text-right text-xs text-gray-400 whitespace-nowrap pl-2">{pct.toFixed(0)}%</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-gray-200 dark:border-neutral-700 font-bold">
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right">{formatMoney(total, "ARS")}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/admin-helpers"
import { getDashboardAnual } from "@/lib/finanzas-data"
import { FinanzasNav } from "../finanzas-nav"
import { AnioSelector } from "../periodo-selector"
import { AnualCharts } from "./anual-charts"

export const dynamic = "force-dynamic"
const BASE = "/admin/tesoreria/finanzas/anual"
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export default async function DashboardAnualPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>
}) {
  const sp = await searchParams
  const anio = parseInt(sp.anio || "") || new Date().getUTCFullYear()
  const d = await getDashboardAnual(anio)

  const fmt = (n: number) => (n === 0 ? "—" : formatMoney(n, "ARS"))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <AnioSelector anio={anio} basePath={BASE} />
      </div>
      <FinanzasNav />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label={`Ingresos ${anio}`} value={formatMoney(d.totalIngresos, "ARS")} cls="text-green-700 dark:text-green-300" />
        <Kpi label={`Gastos ${anio}`} value={formatMoney(d.totalGastos, "ARS")} cls="text-red-700 dark:text-red-300" />
        <Kpi label="Resultado anual" value={formatMoney(d.resultadoAnual, "ARS")} cls={d.resultadoAnual >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"} />
        <Kpi label="Margen" value={`${d.totalIngresos > 0 ? ((d.resultadoAnual / d.totalIngresos) * 100).toFixed(1) : "0"}%`} cls="text-[#6B4F7A]" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ingresos vs Gastos + resultado acumulado</CardTitle></CardHeader>
        <CardContent>
          <AnualCharts data={d.mensual} />
        </CardContent>
      </Card>

      {/* Matriz categorías × meses */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalle por categoría y mes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left px-2 py-1.5 sticky left-0 bg-white dark:bg-neutral-900">Categoría</th>
                {MESES.map((m) => <th key={m} className="text-right px-2 py-1.5">{m}</th>)}
                <th className="text-right px-2 py-1.5 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {d.categorias.map((c) => (
                <tr key={c.nombre} className="border-t border-gray-50 dark:border-neutral-900">
                  <td className={`text-left px-2 py-1 sticky left-0 bg-white dark:bg-neutral-900 ${c.tipo === "INGRESO" ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>{c.nombre}</td>
                  {c.montos.map((m, i) => <td key={i} className="text-right px-2 py-1 text-gray-600 dark:text-gray-300">{fmt(m)}</td>)}
                  <td className="text-right px-2 py-1 font-bold">{fmt(c.total)}</td>
                </tr>
              ))}
              {/* Filas de resultado */}
              <tr className="border-t-2 border-gray-200 dark:border-neutral-700 font-semibold">
                <td className="text-left px-2 py-1.5 sticky left-0 bg-white dark:bg-neutral-900">Resultado mes</td>
                {d.mensual.map((m, i) => (
                  <td key={i} className={`text-right px-2 py-1.5 ${m.resultado < 0 ? "text-red-600 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>{fmt(m.resultado)}</td>
                ))}
                <td className="text-right px-2 py-1.5">{fmt(d.resultadoAnual)}</td>
              </tr>
              <tr className="font-semibold text-[#6B4F7A]">
                <td className="text-left px-2 py-1.5 sticky left-0 bg-white dark:bg-neutral-900">Acumulado</td>
                {d.mensual.map((m, i) => <td key={i} className="text-right px-2 py-1.5">{fmt(m.acumulado)}</td>)}
                <td></td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-xl font-bold ${cls}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

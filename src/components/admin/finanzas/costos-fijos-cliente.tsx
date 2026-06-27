"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, CalendarDays, Bike, TrendingUp, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { InlineEdit } from "@/components/admin/inline-edit"
import { formatMoney } from "@/lib/admin-helpers"
import { calcularMetricasCostosFijos } from "@/lib/finanzas"
import type { CostoFijo, FinanzasConfig } from "@prisma/client"

export function CostosFijosCliente({ costos, config }: { costos: CostoFijo[]; config: FinanzasConfig }) {
  const router = useRouter()
  const [motos, setMotos] = useState(String(config.motosEstimadasMes))
  const [margen, setMargen] = useState(String(config.margenBrutoMoto))
  const [savingCfg, setSavingCfg] = useState(false)

  const metricas = useMemo(
    () => calcularMetricasCostosFijos(costos, { motosEstimadasMes: Number(motos) || 1, margenBrutoMoto: Number(margen) || 1 }),
    [costos, motos, margen]
  )

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of costos) if (c.activo) m.set(c.categoria, (m.get(c.categoria) ?? 0) + c.monto)
    return Array.from(m.entries()).map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto)
  }, [costos])

  async function guardarParams() {
    setSavingCfg(true)
    const res = await fetch("/api/admin/finanzas/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motosEstimadasMes: Number(motos), margenBrutoMoto: Number(margen) }),
    })
    setSavingCfg(false)
    if (res.ok) { toast.success("Parámetros guardados"); router.refresh() } else toast.error("Error")
  }

  async function agregar() {
    const res = await fetch("/api/admin/finanzas/costos-fijos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: "Nuevo costo", categoria: "Otros", monto: 0 }),
    })
    if (res.ok) { router.refresh() } else toast.error("Error")
  }

  async function borrar(id: string) {
    if (!confirm("¿Borrar este costo fijo?")) return
    const res = await fetch(`/api/admin/finanzas/costos-fijos/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Borrado"); router.refresh() } else toast.error("Error")
  }

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Costo fijo mensual" valor={formatMoney(metricas.totalMensual)} icon={TrendingUp} color="#7C3AED" />
        <Kpi label="Por día" valor={formatMoney(Math.round(metricas.costoPorDia))} icon={CalendarDays} color="#9D5CF0" />
        <Kpi label="Por moto vendida" valor={formatMoney(Math.round(metricas.costoPorMoto))} icon={Bike} color="#7C8B9A" />
        <Kpi label="Motos p/ cubrir (breakeven)" valor={metricas.motosMinimas.toFixed(1)} icon={Target} color="#CE9F33" />
        <Kpi label="Costo fijo anual" valor={formatMoney(metricas.costoAnual)} icon={TrendingUp} color="#7C3AED" />
      </div>

      {/* Parámetros */}
      <Card>
        <CardContent className="p-5 flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-xs">Motos vendidas estimadas / mes</Label>
            <Input type="number" value={motos} onChange={(e) => setMotos(e.target.value)} className="w-44" />
          </div>
          <div>
            <Label className="text-xs">Margen bruto por moto (venta − costo)</Label>
            <Input type="number" value={margen} onChange={(e) => setMargen(e.target.value)} className="w-52" />
          </div>
          <Button onClick={guardarParams} disabled={savingCfg} variant="outline">{savingCfg ? "Guardando…" : "Guardar parámetros"}</Button>
          <p className="text-xs text-gray-400 flex-1 min-w-[200px]">
            Necesitás vender <strong className="text-[#CE9F33]">{metricas.motosMinimas.toFixed(1)} motos por mes</strong> solo para cubrir los costos fijos.
          </p>
        </CardContent>
      </Card>

      {/* Subtotales por categoría */}
      {porCategoria.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Costo fijo por categoría</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
              {porCategoria.map((c) => (
                <div key={c.categoria} className="flex items-center justify-between text-sm border-b border-gray-50 py-1">
                  <span className="text-gray-600">{c.categoria}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 tabular-nums">{metricas.totalMensual > 0 ? `${((c.monto / metricas.totalMensual) * 100).toFixed(0)}%` : ""}</span>
                    <span className="tabular-nums font-medium text-gray-800">{formatMoney(c.monto)}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de costos */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-700">Conceptos de costo fijo</span>
          <Button size="sm" variant="outline" onClick={agregar}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="text-left font-medium px-4 py-2">Concepto</th>
              <th className="text-left font-medium px-4 py-2">Categoría</th>
              <th className="text-right font-medium px-4 py-2 w-40">Monto mensual</th>
              <th className="text-right font-medium px-4 py-2 w-20">% del total</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {costos.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="concepto" value={c.concepto} />
                </td>
                <td className="px-4 py-2 text-gray-600">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="categoria" value={c.categoria} />
                </td>
                <td className="px-4 py-2 text-right">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="monto" value={c.monto} type="number" alignRight display={(v) => formatMoney(Number(v))} />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-500">
                  {metricas.totalMensual > 0 ? `${((c.monto / metricas.totalMensual) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => borrar(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 font-bold bg-gray-50">
              <td className="px-4 py-2.5" colSpan={2}>TOTAL COSTO FIJO MENSUAL</td>
              <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#7C3AED" }}>{formatMoney(metricas.totalMensual)}</td>
              <td className="px-4 py-2.5 text-right">100%</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Hacé click en cualquier celda para editarla. El total y las métricas se recalculan solos.</p>
    </div>
  )
}

function Kpi({ label, valor, icon: Icon, color }: { label: string; valor: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="text-lg md:text-xl font-bold text-gray-900 tabular-nums">{valor}</div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, CalendarDays, Bike, TrendingUp, Target, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { InlineEdit } from "@/components/admin/inline-edit"
import { formatMoney } from "@/lib/admin-helpers"
import { calcularMetricasCostosFijos, CATEGORIAS_COSTO_FIJO } from "@/lib/finanzas"
import type { CostoFijo, FinanzasConfig } from "@prisma/client"

const CATEGORIA_OTRA = "__otra__"

export function CostosFijosCliente({
  costos,
  config,
  margenReal = { promedio: 0, cantidad: 0 },
}: {
  costos: CostoFijo[]
  config: FinanzasConfig
  margenReal?: { promedio: number; cantidad: number }
}) {
  const router = useRouter()
  const [motos, setMotos] = useState(String(config.motosEstimadasMes))
  const [margen, setMargen] = useState(String(config.margenBrutoMoto))
  const [savingCfg, setSavingCfg] = useState(false)
  const [agregando, setAgregando] = useState(false)

  // Form de alta de un nuevo costo fijo
  const [nuevoConcepto, setNuevoConcepto] = useState("")
  const [nuevaCategoria, setNuevaCategoria] = useState<string>(CATEGORIAS_COSTO_FIJO[0])
  const [nuevaCategoriaCustom, setNuevaCategoriaCustom] = useState("")
  const [nuevoMonto, setNuevoMonto] = useState("")

  // Opciones para el <select> inline de categoría. Incluye cualquier
  // categoría presente en los datos que no esté en la lista estándar.
  const categoriaOptions = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_COSTO_FIJO)
    for (const c of costos) if (c.categoria) set.add(c.categoria)
    return Array.from(set).map((c) => ({ value: c, label: c }))
  }, [costos])

  const metricas = useMemo(
    () => calcularMetricasCostosFijos(costos, { motosEstimadasMes: Number(motos) || 1, margenBrutoMoto: Number(margen) || 1 }),
    [costos, motos, margen]
  )

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of costos) if (c.activo) m.set(c.categoria, (m.get(c.categoria) ?? 0) + c.monto)
    return Array.from(m.entries()).map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto)
  }, [costos])

  const cantInactivos = useMemo(() => costos.filter((c) => !c.activo).length, [costos])

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
    const concepto = nuevoConcepto.trim()
    if (!concepto) { toast.error("Poné un concepto"); return }
    const categoria = nuevaCategoria === CATEGORIA_OTRA ? nuevaCategoriaCustom.trim() : nuevaCategoria
    if (!categoria) { toast.error("Elegí o escribí una categoría"); return }
    setAgregando(true)
    const res = await fetch("/api/admin/finanzas/costos-fijos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto, categoria, monto: Number(nuevoMonto) || 0 }),
    })
    setAgregando(false)
    if (res.ok) {
      toast.success("Costo agregado")
      setNuevoConcepto(""); setNuevoMonto(""); setNuevaCategoria(CATEGORIAS_COSTO_FIJO[0]); setNuevaCategoriaCustom("")
      router.refresh()
    } else toast.error("Error")
  }

  async function toggleActivo(c: CostoFijo) {
    const res = await fetch(`/api/admin/finanzas/costos-fijos/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !c.activo }),
    })
    if (res.ok) { toast.success(c.activo ? "Excluido del total" : "Incluido en el total"); router.refresh() } else toast.error("Error")
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
            {margenReal.cantidad > 0 && (
              <button
                type="button"
                onClick={() => setMargen(String(margenReal.promedio))}
                className="block mt-1 text-[11px] text-[#7C3AED] hover:underline text-left"
                title="Usar el promedio real de tus ventas cargadas"
              >
                Real: {formatMoney(margenReal.promedio)} (de {margenReal.cantidad} venta{margenReal.cantidad === 1 ? "" : "s"}) — usar
              </button>
            )}
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

      {/* Alta de un nuevo costo fijo */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-[#7C3AED]" /> Agregar costo fijo</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Concepto</Label>
              <Input
                value={nuevoConcepto}
                onChange={(e) => setNuevoConcepto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") agregar() }}
                placeholder="Ej: Alquiler local Av. Colón"
              />
            </div>
            <div className="min-w-[200px]">
              <Label className="text-xs">Categoría</Label>
              <select
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 px-2 text-sm bg-white focus:border-[#9D5CF0] focus:outline-none"
              >
                {CATEGORIAS_COSTO_FIJO.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value={CATEGORIA_OTRA}>Otra…</option>
              </select>
            </div>
            {nuevaCategoria === CATEGORIA_OTRA && (
              <div className="min-w-[180px]">
                <Label className="text-xs">Categoría nueva</Label>
                <Input value={nuevaCategoriaCustom} onChange={(e) => setNuevaCategoriaCustom(e.target.value)} placeholder="Nombre de la categoría" />
              </div>
            )}
            <div className="w-40">
              <Label className="text-xs">Monto mensual</Label>
              <Input
                type="number"
                value={nuevoMonto}
                onChange={(e) => setNuevoMonto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") agregar() }}
                placeholder="0"
                className="text-right"
              />
            </div>
            <Button onClick={agregar} disabled={agregando} style={{ backgroundColor: "#7C3AED" }} className="text-white hover:opacity-90">
              {agregando ? "Agregando…" : "Agregar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de costos */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-700">Conceptos de costo fijo</span>
          {cantInactivos > 0 && (
            <span className="text-[11px] text-gray-400">{cantInactivos} excluido{cantInactivos === 1 ? "" : "s"} del total</span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs border-b border-gray-100">
            <tr>
              <th className="text-left font-medium px-4 py-2">Concepto</th>
              <th className="text-left font-medium px-4 py-2 w-56">Categoría</th>
              <th className="text-left font-medium px-4 py-2">Notas</th>
              <th className="text-right font-medium px-4 py-2 w-40">Monto mensual</th>
              <th className="text-right font-medium px-4 py-2 w-20">% del total</th>
              <th className="text-center font-medium px-4 py-2 w-14">Activo</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {costos.map((c) => (
              <tr key={c.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${c.activo ? "" : "opacity-50"}`}>
                <td className="px-4 py-2">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="concepto" value={c.concepto} />
                </td>
                <td className="px-4 py-2 text-gray-600">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="categoria" value={c.categoria} options={categoriaOptions} />
                </td>
                <td className="px-4 py-2 text-gray-500">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="notas" value={c.notas} placeholder="—" />
                </td>
                <td className="px-4 py-2 text-right">
                  <InlineEdit endpoint={`/api/admin/finanzas/costos-fijos/${c.id}`} field="monto" value={c.monto} type="number" alignRight display={(v) => formatMoney(Number(v))} />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-500">
                  {c.activo && metricas.totalMensual > 0 ? `${((c.monto / metricas.totalMensual) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => toggleActivo(c)}
                    className={`p-1.5 rounded hover:bg-gray-100 ${c.activo ? "text-[#7C3AED]" : "text-gray-400"}`}
                    title={c.activo ? "Activo (cuenta en el total). Click para excluir." : "Excluido del total. Click para incluir."}
                  >
                    {c.activo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => borrar(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 font-bold bg-gray-50">
              <td className="px-4 py-2.5" colSpan={3}>TOTAL COSTO FIJO MENSUAL</td>
              <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#7C3AED" }}>{formatMoney(metricas.totalMensual)}</td>
              <td className="px-4 py-2.5 text-right">100%</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Hacé click en cualquier celda para editarla. El ojo excluye un costo del total sin borrarlo. El total y las métricas se recalculan solos.</p>
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

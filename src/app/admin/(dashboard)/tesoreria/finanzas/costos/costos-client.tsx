"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Target } from "lucide-react"

type Costo = { id: string; concepto: string; monto: number; activo: boolean }
const fmt = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`
const inputCls = "rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"

export function CostosClient({
  costos,
  config,
}: {
  costos: Costo[]
  config: { ventasEstimadasMes: number; margenBrutoVenta: number }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [margen, setMargen] = useState(String(config.margenBrutoVenta || ""))
  const [ventas, setVentas] = useState(String(config.ventasEstimadasMes || ""))

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    try {
      const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
      if (!res.ok) { alert("Error"); return false }
      router.refresh(); return true
    } finally { setBusy(false) }
  }

  const total = costos.filter((c) => c.activo).reduce((s, c) => s + c.monto, 0)
  const margenNum = parseInt(margen || "0") || 0
  const ventasNum = parseInt(ventas || "0") || 0
  const breakeven = margenNum > 0 ? total / margenNum : 0
  const cubierto = margenNum > 0 && ventasNum > 0 ? ventasNum * margenNum : 0
  const alcanza = cubierto >= total

  const crear = async () => {
    if (!concepto.trim() || !parseInt(monto || "0")) return
    const ok = await api("/api/admin/finanzas/costos", "POST", { concepto: concepto.trim(), monto: parseInt(monto) })
    if (ok) { setConcepto(""); setMonto("") }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Costos fijos */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center justify-between">Costos fijos mensuales <span className="text-sm font-normal">{fmt(total)}/mes</span></CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {costos.map((c) => (
            <div key={c.id} className={`flex items-center gap-2 ${!c.activo ? "opacity-40" : ""}`}>
              <input defaultValue={c.concepto} onBlur={(e) => e.target.value.trim() !== c.concepto && api(`/api/admin/finanzas/costos/${c.id}`, "PATCH", { concepto: e.target.value })} className={`${inputCls} flex-1`} />
              <input type="number" defaultValue={c.monto} onBlur={(e) => parseInt(e.target.value || "0") !== c.monto && api(`/api/admin/finanzas/costos/${c.id}`, "PATCH", { monto: parseInt(e.target.value || "0") })} className={`${inputCls} w-28 text-right`} />
              <button onClick={() => confirm("¿Borrar?") && api(`/api/admin/finanzas/costos/${c.id}`, "DELETE")} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          {costos.length === 0 && <p className="text-sm text-gray-400">Cargá tus costos fijos (alquiler, sueldos, luz…).</p>}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Concepto (ej: Alquiler)" className={`${inputCls} flex-1`} />
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" className={`${inputCls} w-28`} />
            <button onClick={crear} disabled={busy} className="rounded bg-[#6B4F7A] text-white p-1.5 hover:bg-[#8B6F9A]"><Plus className="size-4" /></button>
          </div>
        </CardContent>
      </Card>

      {/* Breakeven */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="size-4 text-[#6B4F7A]" /> Punto de equilibrio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Ganancia bruta promedio por venta</label>
              <input type="number" value={margen} onChange={(e) => setMargen(e.target.value)} onBlur={() => api("/api/admin/finanzas/config", "PATCH", { margenBrutoVenta: parseInt(margen || "0") })} placeholder="ej: 800000" className={`${inputCls} w-full`} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Ventas estimadas por mes</label>
              <input type="number" value={ventas} onChange={(e) => setVentas(e.target.value)} onBlur={() => api("/api/admin/finanzas/config", "PATCH", { ventasEstimadasMes: parseInt(ventas || "0") })} placeholder="ej: 15" className={`${inputCls} w-full`} />
            </div>
          </div>
          <div className="rounded-xl bg-[#6B4F7A]/5 p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Necesitás vender</p>
            <p className="text-3xl font-bold text-[#6B4F7A]">{margenNum > 0 ? Math.ceil(breakeven) : "—"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">ventas/mes para cubrir {fmt(total)} de costos fijos</p>
          </div>
          {ventasNum > 0 && margenNum > 0 && (
            <div className={`rounded-lg p-3 text-sm ${alcanza ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"}`}>
              Con {ventasNum} ventas/mes generás {fmt(cubierto)} de margen → {alcanza ? `cubrís los costos y te sobran ${fmt(cubierto - total)}.` : `te faltan ${fmt(total - cubierto)} para cubrir los fijos.`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

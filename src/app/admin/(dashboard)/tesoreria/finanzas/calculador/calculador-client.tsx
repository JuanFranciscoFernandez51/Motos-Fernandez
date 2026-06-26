"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator } from "lucide-react"

type Config = {
  ivaPorcentaje: number
  markupRepuestos: number
  markupAccesorios: number
  markupServicio: number
}
const fmt = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`
const inputCls = "rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm w-full"

export function CalculadorClient({ config }: { config: Config }) {
  const router = useRouter()
  const [rubro, setRubro] = useState<"Repuestos" | "Accesorios" | "Servicio">("Repuestos")
  const [costo, setCosto] = useState("")
  const [costoTieneIva, setCostoTieneIva] = useState(true)
  const [iva, setIva] = useState(String(config.ivaPorcentaje))

  const markupBase = {
    Repuestos: config.markupRepuestos,
    Accesorios: config.markupAccesorios,
    Servicio: config.markupServicio,
  }[rubro]
  const [markupPct, setMarkupPct] = useState(String(Math.round(markupBase * 100)))

  // al cambiar de rubro, refrescar el markup sugerido
  const onRubro = (r: "Repuestos" | "Accesorios" | "Servicio") => {
    setRubro(r)
    const mk = { Repuestos: config.markupRepuestos, Accesorios: config.markupAccesorios, Servicio: config.markupServicio }[r]
    setMarkupPct(String(Math.round(mk * 100)))
  }

  const calc = useMemo(() => {
    const c = parseFloat(costo || "0") || 0
    const ivaPct = parseFloat(iva || "0") || 0
    const mkPct = parseFloat(markupPct || "0") || 0
    const costoConIva = costoTieneIva ? c : c * (1 + ivaPct / 100)
    const precio = costoConIva * (1 + mkPct / 100)
    const ganancia = precio - costoConIva
    const margen = precio > 0 ? (ganancia / precio) * 100 : 0
    // redondeo a la centena más cercana para precio "lindo"
    const precioRedondeado = Math.round(precio / 100) * 100
    return { costoConIva, precio, precioRedondeado, ganancia, margen }
  }, [costo, iva, markupPct, costoTieneIva])

  const guardarMarkup = () => {
    const key = { Repuestos: "markupRepuestos", Accesorios: "markupAccesorios", Servicio: "markupServicio" }[rubro]
    fetch("/api/admin/finanzas/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: (parseFloat(markupPct || "0") || 0) / 100 }),
    }).then(() => router.refresh())
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="size-4 text-[#6B4F7A]" /> Calculador de precio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Rubro</label>
            <div className="flex gap-1 mt-1">
              {(["Repuestos", "Accesorios", "Servicio"] as const).map((r) => (
                <button key={r} onClick={() => onRubro(r)} className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium ${rubro === r ? "bg-[#6B4F7A] text-white" : "bg-gray-100 dark:bg-neutral-800"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Costo {costoTieneIva ? "(con IVA)" : "(sin IVA / neto)"}</label>
            <input type="number" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0" className={inputCls} autoFocus />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={() => setCostoTieneIva((v) => !v)} className={`rounded-full px-3 py-1 text-xs font-semibold ${costoTieneIva ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-200 text-gray-700 dark:bg-neutral-700"}`}>
              {costoTieneIva ? "El costo YA incluye IVA" : "Sumarle IVA al costo"}
            </button>
            {!costoTieneIva && (
              <span className="flex items-center gap-1">IVA <input type="number" value={iva} onChange={(e) => setIva(e.target.value)} className={`${inputCls} w-16 py-1`} />%</span>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500">Markup (ganancia sobre el costo)</label>
            <div className="flex items-center gap-2">
              <input type="number" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} className={`${inputCls} w-24`} />
              <span className="text-sm">%</span>
              <button onClick={guardarMarkup} className="text-xs text-[#6B4F7A] hover:underline ml-auto">Guardar como default de {rubro}</button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#6B4F7A]/30">
        <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Costo con IVA" value={fmt(calc.costoConIva)} />
          <Row label="Markup aplicado" value={`${markupPct || 0}%`} />
          <div className="rounded-xl bg-[#6B4F7A]/5 p-4 text-center my-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">Precio sugerido</p>
            <p className="text-3xl font-bold text-[#6B4F7A]">{fmt(calc.precioRedondeado)}</p>
            <p className="text-[11px] text-gray-400">exacto: {fmt(calc.precio)}</p>
          </div>
          <Row label="Ganancia" value={fmt(calc.ganancia)} cls="text-green-700 dark:text-green-300" />
          <Row label="Margen" value={`${calc.margen.toFixed(1)}%`} cls="text-green-700 dark:text-green-300" />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-semibold ${cls || ""}`}>{value}</span>
    </div>
  )
}

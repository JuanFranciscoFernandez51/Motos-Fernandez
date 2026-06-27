"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save, Upload, Loader2, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { formatMoney } from "@/lib/admin-helpers"
import { CATEGORIAS_CALCULADOR, markupDeCategoria, calcularPrecioSugerido } from "@/lib/finanzas"
import type { FinanzasConfig } from "@prisma/client"

export function CalculadorCliente({ config }: { config: FinanzasConfig }) {
  const router = useRouter()
  const [markups, setMarkups] = useState({
    Indumentaria: config.markupIndumentaria,
    Cascos: config.markupCascos,
    Repuestos: config.markupRepuestos,
    Accesorios: config.markupAccesorios,
  })
  const [iva, setIva] = useState(config.ivaPorcentaje)
  const [saving, setSaving] = useState(false)

  // Calculadora en vivo
  const [costo, setCosto] = useState("")
  const [categoria, setCategoria] = useState<string>("Repuestos")

  const calc = useMemo(() => {
    const c = Number(costo) || 0
    const mk = markupDeCategoria(categoria, {
      markupIndumentaria: markups.Indumentaria, markupCascos: markups.Cascos,
      markupRepuestos: markups.Repuestos, markupAccesorios: markups.Accesorios,
    })
    return calcularPrecioSugerido(c, mk, iva)
  }, [costo, categoria, markups, iva])

  // ===== Factura → productos =====
  const fileRef = useRef<HTMLInputElement>(null)
  const [analizando, setAnalizando] = useState(false)
  const [proveedor, setProveedor] = useState<string | null>(null)
  const [items, setItems] = useState<
    { codigo: string | null; nombre: string; costoNeto: number; categoria: string }[]
  >([])

  const markupCfg = {
    markupIndumentaria: markups.Indumentaria, markupCascos: markups.Cascos,
    markupRepuestos: markups.Repuestos, markupAccesorios: markups.Accesorios,
  }

  async function subirFactura(file: File) {
    setAnalizando(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/finanzas/escanear-factura", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error analizando")
      setProveedor(data.proveedor)
      setItems(data.items)
      toast.success(`${data.items.length} productos leídos de la factura`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setAnalizando(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function cambiarCategoria(i: number, cat: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, categoria: cat } : it)))
  }

  async function guardar() {
    setSaving(true)
    const res = await fetch("/api/admin/finanzas/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markupIndumentaria: markups.Indumentaria, markupCascos: markups.Cascos,
        markupRepuestos: markups.Repuestos, markupAccesorios: markups.Accesorios, ivaPorcentaje: iva,
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Markups guardados"); router.refresh() } else toast.error("Error")
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
      {/* Markups por categoría */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Markup por categoría</h2>
          {CATEGORIAS_CALCULADOR.map((cat) => (
            <div key={cat} className="flex items-center justify-between gap-3">
              <Label className="text-sm">{cat}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={Math.round(markups[cat] * 100)}
                  onChange={(e) => setMarkups((p) => ({ ...p, [cat]: (Number(e.target.value) || 0) / 100 }))}
                  className="w-24 text-right"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <Label className="text-sm">IVA</Label>
            <div className="flex items-center gap-1">
              <Input type="number" value={iva} onChange={(e) => setIva(Number(e.target.value) || 0)} className="w-24 text-right" />
              <span className="text-gray-500">%</span>
            </div>
          </div>
          <Button onClick={guardar} disabled={saving} className="w-full bg-[#5BB5C2] hover:bg-[#3A8B96]">
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Guardando…" : "Guardar markups"}
          </Button>
        </CardContent>
      </Card>

      {/* Calculadora en vivo */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Calcular precio de venta</h2>
          <div>
            <Label className="text-xs">Costo neto (sin IVA, de factura)</Label>
            <Input type="number" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Categoría</Label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
              {CATEGORIAS_CALCULADOR.map((c) => <option key={c} value={c}>{c} ({Math.round(markups[c] * 100)}%)</option>)}
            </select>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
            <Fila label="Costo c/IVA" valor={formatMoney(Math.round(calc.costoConIva))} />
            <Fila label={`Markup aplicado`} valor={`${Math.round(calc.markup * 100)}%`} />
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-800">Precio sugerido</span>
              <span className="text-xl font-bold tabular-nums" style={{ color: "#3A8B96" }}>{formatMoney(calc.precioSugerido)}</span>
            </div>
            <Fila label="Ganancia" valor={formatMoney(Math.round(calc.ganancia))} verde />
            <Fila label="Margen" valor={`${calc.margen.toFixed(1)}%`} verde />
          </div>
          <p className="text-xs text-gray-400">Precio sugerido = costo con IVA × (1 + markup). Es una referencia; el precio final lo definís vos.</p>
        </CardContent>
      </Card>
      </div>

      {/* Factura → precios automáticos */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-gray-800">Tirá la factura y te saca los precios</h2>
              <p className="text-xs text-gray-500">Subí la factura del proveedor (PDF o foto) y la IA extrae los costos y aplica el markup.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFactura(f) }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={analizando} className="bg-[#5BB5C2] hover:bg-[#3A8B96]">
              {analizando ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Leyendo factura…</> : <><Upload className="h-4 w-4 mr-1.5" /> Subir factura</>}
            </Button>
          </div>

          {items.length === 0 ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={analizando}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 py-10 text-center text-gray-400 hover:border-[#7ECAD6] hover:text-[#3A8B96] transition-colors"
            >
              <FileText className="h-7 w-7 mx-auto mb-2" />
              <span className="text-sm">Hacé click para subir una factura (PDF o imagen)</span>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{proveedor ? <>Proveedor: <strong>{proveedor}</strong> · </> : null}{items.length} productos</span>
                <button onClick={() => { setItems([]); setProveedor(null) }} className="text-gray-400 hover:text-red-500 inline-flex items-center gap-1 text-xs"><X className="h-3.5 w-3.5" /> Limpiar</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Producto</th>
                      <th className="text-left font-medium px-3 py-2">Categoría</th>
                      <th className="text-right font-medium px-3 py-2">Costo neto</th>
                      <th className="text-right font-medium px-3 py-2">Precio sugerido</th>
                      <th className="text-right font-medium px-3 py-2">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const mk = markupDeCategoria(it.categoria, markupCfg)
                      const r = calcularPrecioSugerido(it.costoNeto, mk, iva)
                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <div className="text-gray-800">{it.nombre}</div>
                            {it.codigo && <div className="text-[11px] text-gray-400 font-mono">{it.codigo}</div>}
                          </td>
                          <td className="px-3 py-2">
                            <select value={it.categoria} onChange={(e) => cambiarCategoria(i, e.target.value)} className="h-8 rounded border border-gray-300 px-1.5 text-xs">
                              {CATEGORIAS_CALCULADOR.map((c) => <option key={c} value={c}>{c} ({Math.round(markups[c] * 100)}%)</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatMoney(Math.round(it.costoNeto))}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: "#3A8B96" }}>{formatMoney(r.precioSugerido)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{r.margen.toFixed(0)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">Los precios usan el markup de cada categoría (editable arriba) + IVA. Revisá la categoría de cada renglón; el precio se recalcula solo.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Fila({ label, valor, verde }: { label: string; valor: string; verde?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`tabular-nums font-medium ${verde ? "text-emerald-700" : "text-gray-900"}`}>{valor}</span>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Upload, Loader2, Check, Trash2 } from "lucide-react"

type Cuenta = { id: string; nombre: string }
type Categoria = { nombre: string; tipo: string }
type Prop = {
  tipo: string
  categoria: string
  descripcion: string
  monto: number
  moneda: string
  registrado: boolean
  fecha: string | null
}

const inputCls = "rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"

export function IAClient({ cuentas, categorias }: { cuentas: Cuenta[]; categorias: Categoria[] }) {
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [archivo, setArchivo] = useState<{ name: string; b64: string; mime: string } | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [props, setProps] = useState<Prop[]>([])
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id || "")
  const [cargando, setCargando] = useState(false)
  const hoy = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const onFile = (f: File | null) => {
    if (!f) { setArchivo(null); return }
    const reader = new FileReader()
    reader.onload = () => setArchivo({ name: f.name, b64: String(reader.result), mime: f.type })
    reader.readAsDataURL(f)
  }

  const analizar = async () => {
    if (!texto.trim() && !archivo) return
    setAnalizando(true)
    setProps([])
    try {
      const res = await fetch("/api/admin/finanzas/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, fileBase64: archivo?.b64, mimeType: archivo?.mime }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error || "Error"); return }
      const movs: Prop[] = (d.movimientos || []).map((m: Partial<Prop>) => ({
        tipo: m.tipo === "INGRESO" ? "INGRESO" : "GASTO",
        categoria: m.categoria || (m.tipo === "INGRESO" ? "Otros ingresos" : "Otros gastos"),
        descripcion: m.descripcion || "",
        monto: Math.abs(Math.round(Number(m.monto) || 0)),
        moneda: m.moneda === "USD" ? "USD" : "ARS",
        registrado: m.registrado !== false,
        fecha: m.fecha || hoy,
      }))
      if (movs.length === 0) alert("La IA no detectó movimientos. Probá con más detalle.")
      setProps(movs)
    } finally {
      setAnalizando(false)
    }
  }

  const setProp = (i: number, patch: Partial<Prop>) =>
    setProps((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const cargarTodos = async () => {
    if (!cuentaId) return alert("Elegí una cuenta")
    setCargando(true)
    let ok = 0
    try {
      for (const p of props) {
        if (!p.monto) continue
        const res = await fetch("/api/admin/finanzas/movimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modo: "MOVIMIENTO",
            tipo: p.tipo,
            categoria: p.categoria,
            cuentaId,
            monto: p.monto,
            registrado: p.registrado,
            descripcion: p.descripcion,
            fecha: p.fecha || hoy,
          }),
        })
        if (res.ok) ok++
      }
      alert(`✅ Se cargaron ${ok} movimiento(s).`)
      setProps([])
      setTexto("")
      setArchivo(null)
      router.refresh()
    } finally {
      setCargando(false)
    }
  }

  const catsDelTipo = (tipo: string) => categorias.filter((c) => c.tipo === tipo)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-[#6B4F7A]" /> Cargar movimientos con IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder='Escribí en lenguaje natural, ej: "gasté $50.000 de nafta en efectivo en negro" o "cobré 1.200.000 de un service y pagué 300.000 de repuestos por transferencia"'
            className={`${inputCls} w-full`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800">
              <Upload className="size-4" /> {archivo ? archivo.name : "Subir factura / extracto (foto o PDF)"}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            </label>
            <button onClick={analizar} disabled={analizando || (!texto.trim() && !archivo)} className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] text-white px-4 py-1.5 text-sm font-medium hover:bg-[#8B6F9A] disabled:opacity-50">
              {analizando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {analizando ? "Analizando…" : "Analizar"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">La IA propone los movimientos; vos revisás y confirmás antes de cargar. Nunca carga nada solo.</p>
        </CardContent>
      </Card>

      {props.length > 0 && (
        <Card className="border-[#6B4F7A]/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Propuestas ({props.length})
              <div className="flex items-center gap-2">
                <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls}>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button onClick={cargarTodos} disabled={cargando} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {cargando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Cargar todos
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {props.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 border-b border-gray-50 dark:border-neutral-900 pb-2">
                <select value={p.tipo} onChange={(e) => setProp(i, { tipo: e.target.value, categoria: catsDelTipo(e.target.value)[0]?.nombre || p.categoria })} className={inputCls}>
                  <option value="GASTO">Gasto</option><option value="INGRESO">Ingreso</option>
                </select>
                <select value={p.categoria} onChange={(e) => setProp(i, { categoria: e.target.value })} className={inputCls}>
                  {catsDelTipo(p.tipo).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                </select>
                <input value={p.descripcion} onChange={(e) => setProp(i, { descripcion: e.target.value })} placeholder="Descripción" className={`${inputCls} flex-1 min-w-[140px]`} />
                <input type="date" value={p.fecha || hoy} onChange={(e) => setProp(i, { fecha: e.target.value })} className={inputCls} />
                <input type="number" value={p.monto} onChange={(e) => setProp(i, { monto: parseInt(e.target.value || "0") })} className={`${inputCls} w-28 text-right`} />
                <button onClick={() => setProp(i, { registrado: !p.registrado })} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.registrado ? "bg-blue-100 text-blue-700" : "bg-gray-800 text-white"}`}>{p.registrado ? "Blanco" : "Negro"}</button>
                <button onClick={() => setProps((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

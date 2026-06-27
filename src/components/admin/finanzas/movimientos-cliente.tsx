"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, ArrowLeftRight, Pencil, Trash2, Search, TrendingUp, TrendingDown, Upload, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatMoney, formatDate } from "@/lib/admin-helpers"
import { MESES_ES } from "@/lib/finanzas"
import { InlineEdit } from "@/components/admin/inline-edit"
import type { CuentaFinanciera, MovimientoFinanciero } from "@prisma/client"

type Mov = MovimientoFinanciero & { cuenta: CuentaFinanciera }
type Categorias = { ingreso: string[]; gasto: string[] }
const catsDe = (cats: Categorias, tipo: string) => (tipo === "INGRESO" ? cats.ingreso : cats.gasto)

const inputCls =
  "w-full h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A5F7]/40"

function hoyISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function MovimientosCliente({
  cuentas,
  movimientos,
  anio,
  categorias,
}: {
  cuentas: CuentaFinanciera[]
  movimientos: Mov[]
  anio: number
  categorias: Categorias
}) {
  const router = useRouter()

  // Filtros
  const [mes, setMes] = useState<number>(new Date().getMonth())
  const [cuentaFiltro, setCuentaFiltro] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [q, setQ] = useState("")

  // Dialogs
  const [movDialog, setMovDialog] = useState(false)
  const [transferDialog, setTransferDialog] = useState(false)
  const [importDialog, setImportDialog] = useState(false)
  const [editando, setEditando] = useState<Mov | null>(null)
  const [editandoTransf, setEditandoTransf] = useState<Mov | null>(null)

  const filtrados = useMemo(() => {
    return movimientos.filter((m) => {
      const f = new Date(m.fecha)
      if (mes >= 0 && f.getMonth() !== mes) return false
      if (cuentaFiltro && m.cuentaId !== cuentaFiltro) return false
      if (tipoFiltro && m.tipo !== tipoFiltro) return false
      if (q) {
        const t = `${m.descripcion} ${m.categoria} ${m.cuenta.nombre} ${m.comprobante ?? ""}`.toLowerCase()
        if (!t.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [movimientos, mes, cuentaFiltro, tipoFiltro, q])

  const totales = useMemo(() => {
    let ing = 0, gas = 0
    for (const m of filtrados) {
      if (m.cuenta.excluirDeResultado || m.moneda !== "ARS") continue
      if (m.tipo === "INGRESO") ing += m.monto
      else if (m.tipo === "GASTO") gas += m.monto
    }
    return { ing, gas, res: ing - gas }
  }, [filtrados])

  return (
    <div className="space-y-5">
      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => { setEditando(null); setMovDialog(true) }} className="bg-[#9D5CF0] hover:bg-[#7C3AED]">
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo movimiento
        </Button>
        <Button variant="outline" onClick={() => setTransferDialog(true)}>
          <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Transferencia entre cuentas
        </Button>
        <Button variant="outline" onClick={() => setImportDialog(true)}>
          <Upload className="h-4 w-4 mr-1.5" /> Importar de banco (IA)
        </Button>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <select value={anio} onChange={(e) => router.push(`/admin/finanzas/movimientos?anio=${e.target.value}`)} className="h-9 rounded-md border border-gray-300 px-2">
            {[anio - 1, anio, anio + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="h-9 rounded-md border border-gray-300 px-2 text-sm">
          <option value={-1}>Todo el año</option>
          {MESES_ES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="h-9 rounded-md border border-gray-300 px-2 text-sm">
          <option value="">Todos los tipos</option>
          <option value="INGRESO">Ingresos</option>
          <option value="GASTO">Gastos</option>
          <option value="TRANSFERENCIA">Transferencias</option>
        </select>
        <select value={cuentaFiltro} onChange={(e) => setCuentaFiltro(e.target.value)} className="h-9 rounded-md border border-gray-300 px-2 text-sm">
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-9 rounded-md border border-gray-300 pl-8 pr-3 text-sm w-44" />
        </div>
      </div>

      {/* Totales del filtro */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-600" /> Ingresos</div>
          <div className="text-lg font-bold text-emerald-700 tabular-nums">{formatMoney(totales.ing)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-600" /> Gastos</div>
          <div className="text-lg font-bold text-red-700 tabular-nums">{formatMoney(totales.gas)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Resultado</div>
          <div className={`text-lg font-bold tabular-nums ${totales.res >= 0 ? "text-gray-900" : "text-red-700"}`}>{formatMoney(totales.res)}</div>
        </div>
      </div>

      <p className="text-xs text-gray-400">Tip: hacé click en cualquier celda (categoría, descripción, cuenta, monto) para editarla, como en una planilla.</p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left font-medium px-3 py-2.5">Fecha</th>
              <th className="text-left font-medium px-3 py-2.5">Tipo</th>
              <th className="text-left font-medium px-3 py-2.5">Categoría</th>
              <th className="text-left font-medium px-3 py-2.5">Descripción</th>
              <th className="text-left font-medium px-3 py-2.5">Cuenta</th>
              <th className="text-right font-medium px-3 py-2.5">Monto</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">No hay movimientos para este filtro.</td></tr>
            )}
            {filtrados.map((m) => (
              <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{formatDate(m.fecha)}</td>
                <td className="px-3 py-2">
                  <span className={
                    m.tipo === "INGRESO" ? "text-emerald-700 text-xs font-semibold"
                    : m.tipo === "GASTO" ? "text-red-700 text-xs font-semibold"
                    : "text-[#7C3AED] text-xs font-semibold"
                  }>
                    {m.tipo === "INGRESO" ? "Ingreso" : m.tipo === "GASTO" ? "Gasto" : "Transf."}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {m.transferenciaId ? m.categoria : (
                    <InlineEdit
                      endpoint={`/api/admin/finanzas/movimientos/${m.id}`}
                      field="categoria"
                      value={m.categoria}
                      options={catsDe(categorias, m.tipo).map((c) => ({ value: c, label: c }))}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-gray-700 max-w-[260px]" title={m.descripcion}>
                  {m.transferenciaId ? <span className="truncate block">{m.descripcion}</span> : (
                    <InlineEdit endpoint={`/api/admin/finanzas/movimientos/${m.id}`} field="descripcion" value={m.descripcion} placeholder="(sin descripción)" />
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                  {m.transferenciaId ? m.cuenta.nombre : (
                    <InlineEdit
                      endpoint={`/api/admin/finanzas/movimientos/${m.id}`}
                      field="cuentaId"
                      value={m.cuentaId}
                      options={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
                      display={() => m.cuenta.nombre}
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap font-medium">
                  {m.transferenciaId ? (
                    <span className="text-gray-700">{formatMoney(Math.abs(m.monto), m.moneda)}</span>
                  ) : (
                    <InlineEdit
                      endpoint={`/api/admin/finanzas/movimientos/${m.id}`}
                      field="monto"
                      value={m.monto}
                      type="number"
                      alignRight
                      display={(v) => (
                        <span className={m.tipo === "INGRESO" ? "text-emerald-700" : "text-red-700"}>
                          {m.tipo === "GASTO" ? "−" : "+"}{formatMoney(Math.abs(Number(v)), m.moneda)}
                        </span>
                      )}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {m.transferenciaId ? (
                      <button onClick={() => setEditandoTransf(m)} className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Editar transferencia">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => { setEditando(m); setMovDialog(true) }} className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => borrar(m, router)} className="p-1.5 rounded hover:bg-red-100 text-red-500" title="Borrar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {movDialog && (
        <MovimientoDialog
          cuentas={cuentas}
          categorias={categorias}
          editando={editando}
          onClose={() => setMovDialog(false)}
          onSaved={() => { setMovDialog(false); router.refresh() }}
        />
      )}
      {(transferDialog || editandoTransf) && (
        <TransferenciaDialog
          cuentas={cuentas}
          movimientos={movimientos}
          editando={editandoTransf}
          onClose={() => { setTransferDialog(false); setEditandoTransf(null) }}
          onSaved={() => { setTransferDialog(false); setEditandoTransf(null); router.refresh() }}
        />
      )}
      {importDialog && (
        <ImportarExtractoDialog
          cuentas={cuentas}
          categorias={categorias}
          onClose={() => setImportDialog(false)}
          onSaved={() => { setImportDialog(false); router.refresh() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
type MovExtraido = { fecha: string; descripcion: string; monto: number; tipo: string; categoria: string }

function ImportarExtractoDialog({
  cuentas, categorias, onClose, onSaved,
}: {
  cuentas: CuentaFinanciera[]
  categorias: Categorias
  onClose: () => void
  onSaved: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? "")
  const [analizando, setAnalizando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [items, setItems] = useState<MovExtraido[]>([])

  async function subir(file: File) {
    setAnalizando(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/finanzas/importar-extracto", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      setItems(data.movimientos)
      toast.success(`${data.movimientos.length} movimientos leídos`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setAnalizando(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function cargar() {
    if (!cuentaId) { toast.error("Elegí la cuenta"); return }
    setGuardando(true)
    try {
      const res = await fetch("/api/admin/finanzas/importar-extracto/confirmar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuentaId, movimientos: items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      toast.success(`${data.insertados} movimientos cargados`)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setGuardando(false)
    }
  }

  function editarItem(i: number, campo: keyof MovExtraido, valor: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: campo === "monto" ? Number(valor) : valor } : it)))
  }

  const totalGastos = items.filter((i) => i.tipo === "GASTO").reduce((a, i) => a + Math.abs(i.monto), 0)
  const totalIngresos = items.filter((i) => i.tipo === "INGRESO").reduce((a, i) => a + Math.abs(i.monto), 0)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar movimientos de banco con IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Cuenta donde cargar</Label>
              <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls + " min-w-[200px]"}>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <input ref={fileRef} type="file" accept=".xls,.xlsx,application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f) }} />
            <Button onClick={() => fileRef.current?.click()} disabled={analizando} className="bg-[#9D5CF0] hover:bg-[#7C3AED]">
              {analizando ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Leyendo…</> : <><Upload className="h-4 w-4 mr-1.5" /> Subir extracto</>}
            </Button>
          </div>

          {items.length === 0 ? (
            <button onClick={() => fileRef.current?.click()} disabled={analizando}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 py-8 text-center text-gray-400 hover:border-[#C4A5F7] hover:text-[#7C3AED] transition-colors">
              <FileText className="h-6 w-6 mx-auto mb-1.5" />
              <span className="text-sm">Subí el extracto del banco (Excel, PDF o foto)</span>
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{items.length} movimientos · Gastos {formatMoney(totalGastos)} · Ingresos {formatMoney(totalIngresos)}</span>
                <button onClick={() => setItems([])} className="hover:text-red-500">Limpiar</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[45vh]">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-2 py-2">Fecha</th>
                      <th className="text-left font-medium px-2 py-2">Descripción</th>
                      <th className="text-left font-medium px-2 py-2">Tipo</th>
                      <th className="text-left font-medium px-2 py-2">Categoría</th>
                      <th className="text-right font-medium px-2 py-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const cats = it.tipo === "INGRESO" ? categorias.ingreso : categorias.gasto
                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 whitespace-nowrap text-gray-600">{it.fecha}</td>
                          <td className="px-2 py-1.5"><input value={it.descripcion} onChange={(e) => editarItem(i, "descripcion", e.target.value)} className="w-full bg-transparent border-0 focus:ring-0 text-gray-700" /></td>
                          <td className="px-2 py-1.5">
                            <select value={it.tipo} onChange={(e) => editarItem(i, "tipo", e.target.value)} className="h-7 rounded border border-gray-200 text-xs">
                              <option value="GASTO">Gasto</option>
                              <option value="INGRESO">Ingreso</option>
                              <option value="TRANSFERENCIA">Transf.</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            {it.tipo === "TRANSFERENCIA" ? <span className="text-gray-400">—</span> : (
                              <select value={it.categoria} onChange={(e) => editarItem(i, "categoria", e.target.value)} className="h-7 rounded border border-gray-200 text-xs max-w-[160px]">
                                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            )}
                          </td>
                          <td className={`px-2 py-1.5 text-right tabular-nums font-medium ${it.monto < 0 ? "text-red-700" : "text-emerald-700"}`}>{formatMoney(Math.abs(it.monto))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400">Revisá tipo y categoría de cada uno (la IA hace una primera clasificación). Después podés seguir editándolos desde la lista.</p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {items.length > 0 && (
            <Button onClick={cargar} disabled={guardando} className="bg-[#9D5CF0] hover:bg-[#7C3AED]">
              {guardando ? "Cargando…" : `Cargar ${items.length} movimientos`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function borrar(m: Mov, router: ReturnType<typeof useRouter>) {
  const msg = m.transferenciaId
    ? "¿Borrar esta transferencia? Se eliminan las dos patas."
    : "¿Borrar este movimiento?"
  if (!confirm(msg)) return
  const res = await fetch(`/api/admin/finanzas/movimientos/${m.id}`, { method: "DELETE" })
  if (res.ok) { toast.success("Movimiento borrado"); router.refresh() }
  else toast.error("No se pudo borrar")
}

// ─────────────────────────────────────────────────────────────
function MovimientoDialog({
  cuentas, categorias, editando, onClose, onSaved,
}: {
  cuentas: CuentaFinanciera[]
  categorias: Categorias
  editando: Mov | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tipo, setTipo] = useState<"INGRESO" | "GASTO">(editando?.tipo === "GASTO" ? "GASTO" : "INGRESO")
  const [fecha, setFecha] = useState(editando ? new Date(editando.fecha).toISOString().slice(0, 10) : hoyISO())
  const [categoria, setCategoria] = useState(editando?.categoria ?? "")
  const [descripcion, setDescripcion] = useState(editando?.descripcion ?? "")
  const [monto, setMonto] = useState(editando ? String(Math.abs(editando.monto)) : "")
  const [cuentaId, setCuentaId] = useState(editando?.cuentaId ?? cuentas[0]?.id ?? "")
  const [comprobante, setComprobante] = useState(editando?.comprobante ?? "")
  const [observaciones, setObservaciones] = useState(editando?.observaciones ?? "")
  const [saving, setSaving] = useState(false)

  const cats = catsDe(categorias, tipo)

  async function guardar() {
    if (!monto || Number(monto) <= 0) { toast.error("Ingresá un monto válido"); return }
    if (!cuentaId) { toast.error("Elegí una cuenta"); return }
    setSaving(true)
    const body = { fecha, tipo, categoria: categoria || cats[0], descripcion, monto: Number(monto), cuentaId, comprobante, observaciones }
    const res = editando
      ? await fetch(`/api/admin/finanzas/movimientos/${editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch(`/api/admin/finanzas/movimientos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { toast.success(editando ? "Movimiento actualizado" : "Movimiento cargado"); onSaved() }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setTipo("INGRESO"); setCategoria("") }}
              className={`h-10 rounded-md border text-sm font-semibold ${tipo === "INGRESO" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-gray-300 text-gray-500"}`}>
              Ingreso
            </button>
            <button type="button" onClick={() => { setTipo("GASTO"); setCategoria("") }}
              className={`h-10 rounded-md border text-sm font-semibold ${tipo === "GASTO" ? "bg-red-50 border-red-400 text-red-700" : "border-gray-300 text-gray-500"}`}>
              Gasto
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha</Label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className="text-xs">Monto</Label>
              <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Categoría</Label>
            <select value={categoria || cats[0]} onChange={(e) => setCategoria(e.target.value)} className={inputCls}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Cuenta / Medio de pago</Label>
            <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className={inputCls}>
              {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.moneda === "USD" ? "(USD)" : ""}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: VXL 150 cuota Martínez" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nº Comprobante</Label>
              <Input value={comprobante} onChange={(e) => setComprobante(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="text-xs">Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving} className="bg-[#9D5CF0] hover:bg-[#7C3AED]">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
function TransferenciaDialog({
  cuentas, movimientos = [], editando = null, onClose, onSaved,
}: {
  cuentas: CuentaFinanciera[]
  movimientos?: Mov[]
  editando?: Mov | null
  onClose: () => void
  onSaved: () => void
}) {
  // Si estamos editando, buscamos las dos patas de la transferencia
  const patas = editando ? movimientos.filter((m) => m.transferenciaId === editando.transferenciaId) : []
  const pataOrigen = patas.find((m) => m.monto < 0)
  const pataDestino = patas.find((m) => m.monto > 0)

  const [fecha, setFecha] = useState(editando ? new Date(editando.fecha).toISOString().slice(0, 10) : hoyISO())
  const [origenId, setOrigenId] = useState(pataOrigen?.cuentaId ?? cuentas[0]?.id ?? "")
  const [destinoId, setDestinoId] = useState(pataDestino?.cuentaId ?? cuentas[1]?.id ?? "")
  const [montoOrigen, setMontoOrigen] = useState(pataOrigen ? String(Math.abs(pataOrigen.monto)) : "")
  const [montoDestino, setMontoDestino] = useState(pataDestino ? String(Math.abs(pataDestino.monto)) : "")
  const [descripcion, setDescripcion] = useState(editando?.descripcion ?? "")
  const [saving, setSaving] = useState(false)

  const origen = cuentas.find((c) => c.id === origenId)
  const destino = cuentas.find((c) => c.id === destinoId)
  const distintaMoneda = origen && destino && origen.moneda !== destino.moneda

  async function guardar() {
    if (origenId === destinoId) { toast.error("Elegí cuentas distintas"); return }
    if (!montoOrigen || Number(montoOrigen) <= 0) { toast.error("Ingresá el monto"); return }
    setSaving(true)
    // Si editamos, borramos la transferencia vieja (las dos patas) antes de recrear
    if (editando) {
      await fetch(`/api/admin/finanzas/movimientos/${editando.id}`, { method: "DELETE" })
    }
    const body = {
      fecha, cuentaOrigenId: origenId, cuentaDestinoId: destinoId,
      montoOrigen: Number(montoOrigen),
      montoDestino: distintaMoneda && montoDestino ? Number(montoDestino) : undefined,
      descripcion,
    }
    const res = await fetch(`/api/admin/finanzas/transferencia`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { toast.success(editando ? "Transferencia actualizada" : "Transferencia cargada"); onSaved() }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar transferencia" : "Transferencia entre cuentas"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Fecha</Label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Desde (sale)</Label>
              <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} className={inputCls}>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.moneda === "USD" ? "(USD)" : ""}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Hacia (entra)</Label>
              <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className={inputCls}>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.moneda === "USD" ? "(USD)" : ""}</option>)}
              </select>
            </div>
          </div>
          <div className={`grid ${distintaMoneda ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
            <div>
              <Label className="text-xs">Monto que sale {origen ? `(${origen.moneda})` : ""}</Label>
              <input type="number" value={montoOrigen} onChange={(e) => setMontoOrigen(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            {distintaMoneda && (
              <div>
                <Label className="text-xs">Monto que entra ({destino?.moneda})</Label>
                <input type="number" value={montoDestino} onChange={(e) => setMontoDestino(e.target.value)} placeholder="0" className={inputCls} />
              </div>
            )}
          </div>
          {distintaMoneda && (
            <p className="text-[11px] text-amber-600">Cambio de divisa: cargá cuánto sale y cuánto entra (montos distintos).</p>
          )}
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving} className="bg-[#9D5CF0] hover:bg-[#7C3AED]">
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Cargar transferencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

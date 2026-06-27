"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Check, RotateCcw, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatMoney, formatDate } from "@/lib/admin-helpers"
import { TIPOS_POR_COBRAR, TIPOS_POR_PAGAR } from "@/lib/finanzas"
import { ConcretarDialog } from "./concretar-dialog"
import type { CuentaFinanciera } from "@prisma/client"

type Cobro = {
  id: string
  cliente: string
  tipo: string
  descripcion: string | null
  monto: number
  moneda: string
  fechaVencimiento: string | null
  estado: string
  observaciones: string | null
}

const inputCls = "w-full h-10 rounded-md border border-gray-300 px-3 text-sm"

export function CuentasACobrarCliente({
  cobros,
  sentido = "COBRAR",
  cuentasFinancieras = [],
}: {
  cobros: Cobro[]
  sentido?: "COBRAR" | "PAGAR"
  cuentasFinancieras?: CuentaFinanciera[]
}) {
  const router = useRouter()
  const [nuevo, setNuevo] = useState(false)
  const [editar, setEditar] = useState<Cobro | null>(null)
  const [concretando, setConcretando] = useState<Cobro | null>(null)

  const esPagar = sentido === "PAGAR"
  const tipos = esPagar ? TIPOS_POR_PAGAR : TIPOS_POR_COBRAR
  const verboInf = esPagar ? "pagar" : "cobrar"
  const verboPart = esPagar ? "Pagadas" : "Cobradas"
  const acento = esPagar ? "#C8102E" : "#CE9F33"

  const pendientes = cobros.filter((c) => c.estado === "PENDIENTE")
  const cobrados = cobros.filter((c) => c.estado === "COBRADO")

  const totales = useMemo(() => {
    const ars = pendientes.filter((c) => c.moneda === "ARS").reduce((a, c) => a + c.monto, 0)
    const usd = pendientes.filter((c) => c.moneda === "USD").reduce((a, c) => a + c.monto, 0)
    const porTipo = new Map<string, number>()
    for (const c of pendientes) if (c.moneda === "ARS") porTipo.set(c.tipo, (porTipo.get(c.tipo) ?? 0) + c.monto)
    return { ars, usd, porTipo: Array.from(porTipo.entries()).map(([tipo, monto]) => ({ tipo, monto })).sort((a, b) => b.monto - a.monto) }
  }, [pendientes])

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/finanzas/cuentas-a-cobrar/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) router.refresh()
    else toast.error("Error")
  }
  async function borrar(id: string) {
    if (!confirm("¿Borrar esta cuenta a cobrar?")) return
    const res = await fetch(`/api/admin/finanzas/cuentas-a-cobrar/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Borrado"); router.refresh() } else toast.error("Error")
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-[11px] uppercase tracking-wide text-gray-500">Total a {verboInf} (ARS)</div><div className="text-xl font-bold tabular-nums" style={{ color: acento }}>{formatMoney(totales.ars)}</div></CardContent></Card>
        {totales.usd > 0 && <Card><CardContent className="p-4"><div className="text-[11px] uppercase tracking-wide text-gray-500">A {verboInf} (USD)</div><div className="text-xl font-bold tabular-nums text-emerald-700">{formatMoney(totales.usd, "USD")}</div></CardContent></Card>}
        <Card><CardContent className="p-4"><div className="text-[11px] uppercase tracking-wide text-gray-500">Pendientes</div><div className="text-xl font-bold text-gray-900">{pendientes.length}</div></CardContent></Card>
      </div>

      {totales.porTipo.length > 0 && (
        <Card><CardContent className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Por tipo (pendiente, ARS)</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
            {totales.porTipo.map((t) => (
              <div key={t.tipo} className="flex items-center justify-between border-b border-gray-50 py-1">
                <span className="text-gray-600">{t.tipo}</span>
                <span className="tabular-nums font-medium text-gray-800">{formatMoney(t.monto)}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setNuevo(true)} className="bg-[#5BB5C2] hover:bg-[#3A8B96]"><Plus className="h-4 w-4 mr-1.5" /> Nueva cuenta a {verboInf}</Button>
      </div>

      <Tabla titulo="Pendientes" verboInf={verboInf} cobros={pendientes} router={router} patch={patch} borrar={borrar} onEdit={setEditar} onConcretar={setConcretando} />
      {cobrados.length > 0 && <Tabla titulo={verboPart} verboInf={verboInf} cobros={cobrados} router={router} patch={patch} borrar={borrar} onEdit={setEditar} onConcretar={setConcretando} cobrada />}

      {(nuevo || editar) && (
        <CobroDialog cobro={editar} sentido={sentido} tipos={tipos} onClose={() => { setNuevo(false); setEditar(null) }} onSaved={() => { setNuevo(false); setEditar(null); router.refresh() }} />
      )}
      {concretando && (
        <ConcretarDialog
          cuentas={cuentasFinancieras}
          verbo={esPagar ? "pagar" : "cobrar"}
          detalle={`${concretando.cliente} — ${formatMoney(concretando.monto, concretando.moneda)}`}
          onClose={() => setConcretando(null)}
          onConfirm={async (crearMovimiento, cuentaId) => { await patch(concretando.id, { estado: "COBRADO", crearMovimiento, cuentaId }); setConcretando(null) }}
        />
      )}
    </div>
  )
}

function Tabla({ titulo, verboInf, cobros, patch, borrar, onEdit, onConcretar, cobrada }: {
  titulo: string; verboInf: string; cobros: Cobro[]; router: ReturnType<typeof useRouter>
  patch: (id: string, b: Record<string, unknown>) => void; borrar: (id: string) => void
  onEdit: (c: Cobro) => void; onConcretar: (c: Cobro) => void; cobrada?: boolean
}) {
  const now = new Date()
  const part = verboInf === "pagar" ? "pagada" : "cobrada"
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700">{titulo} ({cobros.length})</div>
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs border-b border-gray-100">
          <tr>
            <th className="text-left font-medium px-4 py-2">Cliente</th>
            <th className="text-left font-medium px-4 py-2">Tipo</th>
            <th className="text-left font-medium px-4 py-2">Detalle</th>
            <th className="text-right font-medium px-4 py-2">Monto</th>
            <th className="text-left font-medium px-4 py-2">Vencimiento</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {cobros.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin registros.</td></tr>}
          {cobros.map((c) => {
            const vencido = !cobrada && c.fechaVencimiento && new Date(c.fechaVencimiento) < now
            return (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{c.cliente}</td>
                <td className="px-4 py-2.5 text-gray-600">{c.tipo}</td>
                <td className="px-4 py-2.5 text-gray-500 max-w-[220px] truncate" title={c.descripcion || ""}>{c.descripcion || "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(c.monto, c.moneda)}</td>
                <td className="px-4 py-2.5">
                  {c.fechaVencimiento ? (
                    <span className={vencido ? "text-red-600 font-medium flex items-center gap-1" : "text-gray-600"}>{vencido && <AlertTriangle className="h-3 w-3" />}{formatDate(c.fechaVencimiento)}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {cobrada ? (
                      <button onClick={() => patch(c.id, { estado: "PENDIENTE" })} className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Volver a pendiente"><RotateCcw className="h-3.5 w-3.5" /></button>
                    ) : (
                      <button onClick={() => onConcretar(c)} className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600" title={`Marcar ${part}`}><Check className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => onEdit(c)} className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Editar">✎</button>
                    <button onClick={() => borrar(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500" title="Borrar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CobroDialog({ cobro, sentido, tipos, onClose, onSaved }: { cobro: Cobro | null; sentido: "COBRAR" | "PAGAR"; tipos: readonly string[]; onClose: () => void; onSaved: () => void }) {
  const esEdit = !!cobro
  const verboInf = sentido === "PAGAR" ? "pagar" : "cobrar"
  const [cliente, setCliente] = useState(cobro?.cliente ?? "")
  const [tipo, setTipo] = useState(cobro?.tipo ?? tipos[0])
  const [descripcion, setDescripcion] = useState(cobro?.descripcion ?? "")
  const [monto, setMonto] = useState(cobro ? String(cobro.monto) : "")
  const [moneda, setMoneda] = useState(cobro?.moneda ?? "ARS")
  const [fecha, setFecha] = useState(cobro?.fechaVencimiento ? new Date(cobro.fechaVencimiento).toISOString().slice(0, 10) : "")
  const [obs, setObs] = useState(cobro?.observaciones ?? "")
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!cliente.trim() || !monto) { toast.error("Cliente y monto son obligatorios"); return }
    setSaving(true)
    const body = { sentido, cliente, tipo, descripcion, monto: Number(monto), moneda, fechaVencimiento: fecha || null, observaciones: obs }
    const res = esEdit
      ? await fetch(`/api/admin/finanzas/cuentas-a-cobrar/${cobro!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch(`/api/admin/finanzas/cuentas-a-cobrar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { toast.success(esEdit ? "Actualizado" : "Cargado"); onSaved() }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{esEdit ? `Editar cuenta a ${verboInf}` : `Nueva cuenta a ${verboInf}`}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Cliente</Label><Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Vencimiento (opcional)</Label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Monto</Label><Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputCls}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
          </div>
          <div><Label className="text-xs">Detalle</Label><Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: VXL 150 cuota 2 / Casco LS2 / Service" /></div>
          <div><Label className="text-xs">Observaciones</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving} className="bg-[#5BB5C2] hover:bg-[#3A8B96]">{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

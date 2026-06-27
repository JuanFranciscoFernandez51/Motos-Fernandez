"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Check, RotateCcw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatMoney, formatDate } from "@/lib/admin-helpers"
import { ConcretarDialog } from "./concretar-dialog"
import type { Cheque, CuentaFinanciera } from "@prisma/client"

const inputCls = "w-full h-10 rounded-md border border-gray-300 px-3 text-sm"

export function ChequesCliente({ cheques, cuentasFinancieras = [] }: { cheques: Cheque[]; cuentasFinancieras?: CuentaFinanciera[] }) {
  const router = useRouter()
  const [nuevo, setNuevo] = useState(false)
  const [concretando, setConcretando] = useState<Cheque | null>(null)

  async function patchCheque(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/finanzas/cheques/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) router.refresh()
    else toast.error("Error")
  }

  const aCobrar = cheques.filter((c) => c.tipo === "A_COBRAR")
  const aPagar = cheques.filter((c) => c.tipo === "A_PAGAR")

  const totales = useMemo(() => {
    const pendCobrar = aCobrar.filter((c) => c.estado === "PENDIENTE").reduce((a, c) => a + c.monto, 0)
    const pendPagar = aPagar.filter((c) => c.estado === "PENDIENTE").reduce((a, c) => a + c.monto, 0)
    return { pendCobrar, pendPagar, neto: pendCobrar - pendPagar }
  }, [aCobrar, aPagar])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-[11px] uppercase tracking-wide text-gray-500">A cobrar (pendiente)</div><div className="text-xl font-bold text-emerald-700 tabular-nums">{formatMoney(totales.pendCobrar)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] uppercase tracking-wide text-gray-500">A pagar (pendiente)</div><div className="text-xl font-bold text-red-700 tabular-nums">{formatMoney(totales.pendPagar)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] uppercase tracking-wide text-gray-500">Neto cheques</div><div className={`text-xl font-bold tabular-nums ${totales.neto >= 0 ? "text-gray-900" : "text-red-700"}`}>{formatMoney(totales.neto)}</div></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setNuevo(true)} className="bg-[#5BB5C2] hover:bg-[#3A8B96]"><Plus className="h-4 w-4 mr-1.5" /> Nuevo cheque</Button>
      </div>

      <SeccionCheques titulo="A cobrar" cheques={aCobrar} router={router} onConcretar={setConcretando} />
      <SeccionCheques titulo="A pagar" cheques={aPagar} router={router} onConcretar={setConcretando} />

      {nuevo && <NuevoChequeDialog onClose={() => setNuevo(false)} onSaved={() => { setNuevo(false); router.refresh() }} />}
      {concretando && (
        <ConcretarDialog
          cuentas={cuentasFinancieras}
          verbo={concretando.tipo === "A_COBRAR" ? "cobrar" : "pagar"}
          detalle={`Cheque ${concretando.beneficiario} — ${formatMoney(concretando.monto, concretando.moneda)}`}
          onClose={() => setConcretando(null)}
          onConfirm={async (crearMovimiento, cuentaId) => { await patchCheque(concretando.id, { estado: "CONCRETADO", crearMovimiento, cuentaId }); setConcretando(null) }}
        />
      )}
    </div>
  )
}

function SeccionCheques({ titulo, cheques, router, onConcretar }: { titulo: string; cheques: Cheque[]; router: ReturnType<typeof useRouter>; onConcretar: (c: Cheque) => void }) {
  const now = new Date()
  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/finanzas/cheques/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) { router.refresh() } else toast.error("Error")
  }
  async function borrar(id: string) {
    if (!confirm("¿Borrar este cheque?")) return
    const res = await fetch(`/api/admin/finanzas/cheques/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Borrado"); router.refresh() } else toast.error("Error")
  }
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700">{titulo} ({cheques.length})</div>
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs border-b border-gray-100">
          <tr>
            <th className="text-left font-medium px-4 py-2">Beneficiario</th>
            <th className="text-right font-medium px-4 py-2">Monto</th>
            <th className="text-left font-medium px-4 py-2">Vencimiento</th>
            <th className="text-left font-medium px-4 py-2">Formato</th>
            <th className="text-left font-medium px-4 py-2">Estado</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {cheques.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin cheques.</td></tr>}
          {cheques.map((c) => {
            const vencido = c.estado === "PENDIENTE" && new Date(c.fechaVencimiento) < now
            return (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2.5">{c.beneficiario}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(c.monto, c.moneda)}</td>
                <td className="px-4 py-2.5">
                  <span className={vencido ? "text-red-600 font-medium flex items-center gap-1" : "text-gray-600"}>
                    {vencido && <AlertTriangle className="h-3 w-3" />}{formatDate(c.fechaVencimiento)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{c.formato}</td>
                <td className="px-4 py-2.5">
                  <span className={
                    c.estado === "CONCRETADO" ? "text-xs font-semibold text-emerald-700"
                    : c.estado === "ANULADO" ? "text-xs font-semibold text-gray-400 line-through"
                    : vencido ? "text-xs font-semibold text-red-600" : "text-xs font-semibold text-amber-600"
                  }>
                    {c.estado === "CONCRETADO" ? (c.tipo === "A_COBRAR" ? "Cobrado" : "Pagado") : c.estado === "ANULADO" ? "Anulado" : vencido ? "Vencido" : "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {c.estado === "PENDIENTE" ? (
                      <button onClick={() => onConcretar(c)} className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600" title={c.tipo === "A_COBRAR" ? "Marcar cobrado" : "Marcar pagado"}><Check className="h-3.5 w-3.5" /></button>
                    ) : (
                      <button onClick={() => patch(c.id, { estado: "PENDIENTE" })} className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Volver a pendiente"><RotateCcw className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => borrar(c.id)} className="p-1.5 rounded hover:bg-red-100 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
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

function NuevoChequeDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<"A_COBRAR" | "A_PAGAR">("A_COBRAR")
  const [beneficiario, setBeneficiario] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState("")
  const [formato, setFormato] = useState("E-Cheq")
  const [obs, setObs] = useState("")
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!beneficiario.trim() || !monto || !fecha) { toast.error("Completá beneficiario, monto y vencimiento"); return }
    setSaving(true)
    const res = await fetch("/api/admin/finanzas/cheques", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, beneficiario, monto: Number(monto), fechaVencimiento: fecha, formato, observaciones: obs }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Cheque cargado"); onSaved() } else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo cheque</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTipo("A_COBRAR")} className={`h-10 rounded-md border text-sm font-semibold ${tipo === "A_COBRAR" ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-gray-300 text-gray-500"}`}>A cobrar</button>
            <button onClick={() => setTipo("A_PAGAR")} className={`h-10 rounded-md border text-sm font-semibold ${tipo === "A_PAGAR" ? "bg-red-50 border-red-400 text-red-700" : "border-gray-300 text-gray-500"}`}>A pagar</button>
          </div>
          <div><Label className="text-xs">Beneficiario</Label><Input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Ej: SIMPA" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Monto</Label><Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
            <div><Label className="text-xs">Vencimiento</Label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
          </div>
          <div><Label className="text-xs">Formato</Label><Input value={formato} onChange={(e) => setFormato(e.target.value)} placeholder="E-Cheq" /></div>
          <div><Label className="text-xs">Observaciones</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving} className="bg-[#5BB5C2] hover:bg-[#3A8B96]">{saving ? "Guardando…" : "Cargar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

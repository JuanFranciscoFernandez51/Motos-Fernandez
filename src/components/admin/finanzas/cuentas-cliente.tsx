"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatMoney } from "@/lib/admin-helpers"
import type { CuentaFinanciera } from "@prisma/client"

type SaldoMin = { id: string; movimientoNeto: number; saldoActual: number }

export function CuentasCliente({
  cuentas,
  saldos,
}: {
  cuentas: CuentaFinanciera[]
  saldos: SaldoMin[]
}) {
  const router = useRouter()
  const [nueva, setNueva] = useState(false)
  // saldos iniciales editables localmente
  const [editSaldo, setEditSaldo] = useState<Record<string, string>>(
    Object.fromEntries(cuentas.map((c) => [c.id, String(c.saldoInicial)]))
  )
  const [guardando, setGuardando] = useState<string | null>(null)

  const saldoDe = (id: string) => saldos.find((s) => s.id === id)

  async function guardarSaldo(c: CuentaFinanciera) {
    const val = Number(editSaldo[c.id])
    if (Number.isNaN(val)) { toast.error("Saldo inválido"); return }
    setGuardando(c.id)
    const res = await fetch("/api/admin/finanzas/cuentas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, saldoInicial: val }),
    })
    setGuardando(null)
    if (res.ok) { toast.success(`Saldo inicial de ${c.nombre} guardado`); router.refresh() }
    else toast.error("No se pudo guardar")
  }

  const ars = cuentas.filter((c) => c.moneda === "ARS")
  const usd = cuentas.filter((c) => c.moneda === "USD")

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setNueva(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Agregar cuenta
        </Button>
      </div>

      {[{ titulo: "Cuentas en pesos (ARS)", lista: ars, moneda: "ARS" }, { titulo: "Cuentas en dólares (USD)", lista: usd, moneda: "USD" }].map(
        (grupo) => grupo.lista.length > 0 && (
          <div key={grupo.moneda} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700">{grupo.titulo}</div>
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs">
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium px-4 py-2">Cuenta</th>
                  <th className="text-right font-medium px-4 py-2 w-48">Saldo inicial</th>
                  <th className="text-right font-medium px-4 py-2">Movimiento neto</th>
                  <th className="text-right font-medium px-4 py-2">Saldo actual</th>
                </tr>
              </thead>
              <tbody>
                {grupo.lista.map((c) => {
                  const s = saldoDe(c.id)
                  const cambiado = String(c.saldoInicial) !== editSaldo[c.id]
                  return (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5">
                        {c.nombre}
                        {c.excluirDeResultado && <span className="ml-2 text-[10px] text-gray-400">(excluida de resultados)</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            value={editSaldo[c.id]}
                            onChange={(e) => setEditSaldo((p) => ({ ...p, [c.id]: e.target.value }))}
                            className="w-32 h-9 rounded-md border border-gray-300 px-2 text-right text-sm"
                          />
                          {cambiado && (
                            <button onClick={() => guardarSaldo(c)} disabled={guardando === c.id} className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="Guardar">
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{formatMoney(s?.movimientoNeto ?? 0, c.moneda)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${(s?.saldoActual ?? 0) < 0 ? "text-red-600" : "text-gray-900"}`}>{formatMoney(s?.saldoActual ?? 0, c.moneda)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <p className="text-xs text-gray-400">
        El saldo inicial es la plata que había en cada cuenta antes de empezar a cargar movimientos. El saldo actual se calcula solo: saldo inicial + movimientos.
      </p>

      {nueva && <NuevaCuentaDialog onClose={() => setNueva(false)} onSaved={() => { setNueva(false); router.refresh() }} />}
    </div>
  )
}

function NuevaCuentaDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState("")
  const [moneda, setMoneda] = useState("ARS")
  const [saldoInicial, setSaldoInicial] = useState("0")
  const [excluir, setExcluir] = useState(false)
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!nombre.trim()) { toast.error("Poné un nombre"); return }
    setSaving(true)
    const res = await fetch("/api/admin/finanzas/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), moneda, saldoInicial: Number(saldoInicial) || 0, excluirDeResultado: excluir }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Cuenta creada"); onSaved() }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva cuenta</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Banco Galicia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Moneda</Label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Saldo inicial</Label>
              <Input type="number" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={excluir} onChange={(e) => setExcluir(e.target.checked)} />
            Excluir de ingresos/gastos (como la Cuenta Papá)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving} className="bg-[#5BB5C2] hover:bg-[#3A8B96]">{saving ? "Guardando…" : "Crear"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

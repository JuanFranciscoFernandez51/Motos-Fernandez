"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Check, Loader2 } from "lucide-react"
import { TIPOS_CXC } from "@/lib/finanzas"

type Cuenta = { id: string; nombre: string; moneda: string }
type Cxc = {
  id: string
  sentido: string
  cliente: string
  tipo: string
  descripcion: string | null
  monto: number
  moneda: string
  fechaVencimiento: string | null
  estado: string
}
type Cheque = {
  id: string
  tipo: string
  beneficiario: string
  monto: number
  moneda: string
  formato: string
  fechaVencimiento: string
  estado: string
}

const fmt = (n: number, m: string) => `${m === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`
const fmtFecha = (s: string | null) =>
  s ? new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "—"
const diasHasta = (s: string | null) => {
  if (!s) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  return Math.round((new Date(s + "T12:00:00").getTime() - hoy.getTime()) / 86400000)
}
const inputCls = "rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"

export function CuentasChequesClient({
  cuentas,
  cxc,
  cheques,
}: {
  cuentas: Cuenta[]
  cxc: Cxc[]
  cheques: Cheque[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [cobrando, setCobrando] = useState<string | null>(null)
  const [cuentaSel, setCuentaSel] = useState(cuentas[0]?.id || "")

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) { alert((await res.json().catch(() => ({})))?.error || "Error"); return false }
      router.refresh(); return true
    } finally { setBusy(false); setCobrando(null) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CxcCard titulo="A cobrar" sentido="COBRAR" items={cxc.filter((c) => c.sentido === "COBRAR")} cuentas={cuentas} api={api} busy={busy} cobrando={cobrando} setCobrando={setCobrando} cuentaSel={cuentaSel} setCuentaSel={setCuentaSel} />
      <CxcCard titulo="A pagar" sentido="PAGAR" items={cxc.filter((c) => c.sentido === "PAGAR")} cuentas={cuentas} api={api} busy={busy} cobrando={cobrando} setCobrando={setCobrando} cuentaSel={cuentaSel} setCuentaSel={setCuentaSel} />
      <div className="lg:col-span-2">
        <ChequesCard cheques={cheques} cuentas={cuentas} api={api} busy={busy} cobrando={cobrando} setCobrando={setCobrando} cuentaSel={cuentaSel} setCuentaSel={setCuentaSel} />
      </div>
    </div>
  )
}

type Shared = {
  cuentas: Cuenta[]
  api: (url: string, method: string, body?: unknown) => Promise<boolean>
  busy: boolean
  cobrando: string | null
  setCobrando: (v: string | null) => void
  cuentaSel: string
  setCuentaSel: (v: string) => void
}

function CobrarRow({ cuentas, cuentaSel, setCuentaSel, onRegistrar, onSolo }: { cuentas: Cuenta[]; cuentaSel: string; setCuentaSel: (v: string) => void; onRegistrar: () => void; onSolo: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 p-2 rounded bg-green-50 dark:bg-green-950/30">
      <span className="text-xs text-gray-600 dark:text-gray-300">¿En qué cuenta entró/salió?</span>
      <select value={cuentaSel} onChange={(e) => setCuentaSel(e.target.value)} className={inputCls}>
        {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <button onClick={onRegistrar} className="rounded bg-green-600 text-white px-2 py-1 text-xs font-medium hover:bg-green-700">Registrar en caja</button>
      <button onClick={onSolo} className="rounded border border-gray-300 dark:border-neutral-700 px-2 py-1 text-xs">Solo marcar</button>
    </div>
  )
}

function CxcCard({ titulo, sentido, items, ...s }: { titulo: string; sentido: string; items: Cxc[] } & Shared) {
  const [cliente, setCliente] = useState("")
  const [tipo, setTipo] = useState(TIPOS_CXC[0])
  const [monto, setMonto] = useState("")
  const [venc, setVenc] = useState("")
  const pendientes = items.filter((i) => i.estado === "PENDIENTE")
  const totalPend = pendientes.filter((i) => i.moneda === "ARS").reduce((a, b) => a + b.monto, 0)

  const crear = async () => {
    if (!cliente.trim() || !parseInt(monto || "0")) return
    const ok = await s.api("/api/admin/finanzas/cxc", "POST", { sentido, cliente: cliente.trim(), tipo, monto: parseInt(monto), fechaVencimiento: venc || null })
    if (ok) { setCliente(""); setMonto(""); setVenc("") }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center justify-between">{titulo}<span className="text-sm font-normal text-gray-500">{fmt(totalPend, "ARS")} pend.</span></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {pendientes.length === 0 && <p className="text-sm text-gray-400">Nada pendiente.</p>}
        {pendientes.map((i) => {
          const dias = diasHasta(i.fechaVencimiento)
          return (
            <div key={i.id} className="border-b border-gray-50 dark:border-neutral-900 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{i.cliente} <span className="text-xs text-gray-400">· {i.tipo}</span></p>
                  <p className="text-xs text-gray-500">
                    Vence {fmtFecha(i.fechaVencimiento)}
                    {dias !== null && <span className={dias < 0 ? " text-red-600 font-semibold" : dias <= 7 ? " text-amber-600 font-semibold" : ""}>{dias < 0 ? ` · atrasado ${-dias}d` : dias <= 7 ? ` · en ${dias}d` : ""}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-bold text-sm">{fmt(i.monto, i.moneda)}</span>
                  <button onClick={() => s.setCobrando(s.cobrando === i.id ? null : i.id)} className="rounded bg-green-600 text-white px-2 py-1 text-xs hover:bg-green-700">{sentido === "COBRAR" ? "Cobré" : "Pagué"}</button>
                  <button onClick={() => confirm("¿Borrar?") && s.api(`/api/admin/finanzas/cxc/${i.id}`, "DELETE")} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              {s.cobrando === i.id && (
                <CobrarRow cuentas={s.cuentas} cuentaSel={s.cuentaSel} setCuentaSel={s.setCuentaSel}
                  onRegistrar={() => s.api(`/api/admin/finanzas/cxc/${i.id}`, "PATCH", { accion: "cobrar", cuentaId: s.cuentaSel })}
                  onSolo={() => s.api(`/api/admin/finanzas/cxc/${i.id}`, "PATCH", { accion: "cobrar" })} />
              )}
            </div>
          )
        })}
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente / proveedor" className={`${inputCls} w-36`} />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>{TIPOS_CXC.map((t) => <option key={t}>{t}</option>)}</select>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" className={`${inputCls} w-24`} />
          <input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} className={inputCls} title="Vencimiento" />
          <button onClick={crear} disabled={s.busy} className="inline-flex items-center gap-1 rounded bg-[#6B4F7A] text-white px-2 py-1.5 text-xs hover:bg-[#8B6F9A]"><Plus className="size-3.5" /></button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChequesCard({ cheques, ...s }: { cheques: Cheque[] } & Shared) {
  const [tipo, setTipo] = useState("A_COBRAR")
  const [benef, setBenef] = useState("")
  const [monto, setMonto] = useState("")
  const [venc, setVenc] = useState("")
  const pendientes = cheques.filter((c) => c.estado === "PENDIENTE")

  const crear = async () => {
    if (!benef.trim() || !parseInt(monto || "0") || !venc) return
    const ok = await s.api("/api/admin/finanzas/cheques", "POST", { tipo, beneficiario: benef.trim(), monto: parseInt(monto), fechaVencimiento: venc })
    if (ok) { setBenef(""); setMonto(""); setVenc("") }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cheques</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {pendientes.length === 0 && <p className="text-sm text-gray-400">Sin cheques pendientes.</p>}
        {pendientes.map((c) => {
          const dias = diasHasta(c.fechaVencimiento)
          return (
            <div key={c.id} className="border-b border-gray-50 dark:border-neutral-900 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span className={`text-[10px] rounded px-1 mr-1 font-bold ${c.tipo === "A_COBRAR" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.tipo === "A_COBRAR" ? "A COBRAR" : "A PAGAR"}</span>
                    {c.beneficiario} <span className="text-xs text-gray-400">· {c.formato}</span>
                  </p>
                  <p className="text-xs text-gray-500">Vence {fmtFecha(c.fechaVencimiento)}{dias !== null && <span className={dias < 0 ? " text-red-600 font-semibold" : dias <= 7 ? " text-amber-600 font-semibold" : ""}>{dias < 0 ? ` · atrasado ${-dias}d` : dias <= 7 ? ` · en ${dias}d` : ""}</span>}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-bold text-sm">{fmt(c.monto, c.moneda)}</span>
                  <button onClick={() => s.setCobrando(s.cobrando === c.id ? null : c.id)} className="rounded bg-green-600 text-white px-2 py-1 text-xs hover:bg-green-700"><Check className="size-3 inline" /> Concretar</button>
                  <button onClick={() => confirm("¿Borrar?") && s.api(`/api/admin/finanzas/cheques/${c.id}`, "DELETE")} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
              {s.cobrando === c.id && (
                <CobrarRow cuentas={s.cuentas} cuentaSel={s.cuentaSel} setCuentaSel={s.setCuentaSel}
                  onRegistrar={() => s.api(`/api/admin/finanzas/cheques/${c.id}`, "PATCH", { accion: "concretar", cuentaId: s.cuentaSel })}
                  onSolo={() => s.api(`/api/admin/finanzas/cheques/${c.id}`, "PATCH", { accion: "concretar" })} />
              )}
            </div>
          )
        })}
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}><option value="A_COBRAR">A cobrar</option><option value="A_PAGAR">A pagar</option></select>
          <input value={benef} onChange={(e) => setBenef(e.target.value)} placeholder="Beneficiario / librador" className={`${inputCls} w-40`} />
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" className={`${inputCls} w-24`} />
          <input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} className={inputCls} title="Vencimiento" />
          <button onClick={crear} disabled={s.busy} className="inline-flex items-center gap-1 rounded bg-[#6B4F7A] text-white px-2 py-1.5 text-xs hover:bg-[#8B6F9A]">{s.busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}</button>
        </div>
      </CardContent>
    </Card>
  )
}

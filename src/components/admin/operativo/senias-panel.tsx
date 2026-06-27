"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HandCoins, Plus, Trash2, Loader2, Check, X, Wallet } from "lucide-react"

type Senia = {
  id: string
  monto: number
  moneda: string
  metodo: string
  fecha: string
  detalle: string | null
  enCaja: boolean
}
type Cuenta = { id: string; nombre: string; moneda: string }

const METODOS = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADO_PAGO", "CHEQUE", "OTRO"] as const
const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta",
  MERCADO_PAGO: "Mercado Pago", CHEQUE: "Cheque", OTRO: "Otro",
}
const fmt = (n: number, m: string) => `${m === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`
const fmtFecha = (s: string) => new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" })

export function SeniasPanel({
  ordenId,
  senias,
  precioVenta,
  moneda,
  cuentas,
}: {
  ordenId: string
  senias: Senia[]
  precioVenta: number
  moneda: string
  cuentas: Cuenta[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const hoy = new Date().toISOString().split("T")[0]
  const [monto, setMonto] = useState("")
  const [metodo, setMetodo] = useState<string>("EFECTIVO")
  const [fecha, setFecha] = useState(hoy)
  const [detalle, setDetalle] = useState("")
  const [registrar, setRegistrar] = useState(true)
  const cuentasMoneda = cuentas.filter((c) => c.moneda === moneda)
  const [cuentaId, setCuentaId] = useState(cuentasMoneda[0]?.id || cuentas[0]?.id || "")

  // Total de señas en la moneda de la OC (las de otra moneda se listan pero no
  // se restan del saldo en distinta divisa).
  const totalSenias = senias.filter((s) => s.moneda === moneda).reduce((a, s) => a + s.monto, 0)
  const saldo = precioVenta - totalSenias

  const agregar = async () => {
    const m = Math.round(Number(monto))
    if (!m || m <= 0) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/ordenes-compra/${ordenId}/senias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: m, moneda, metodo, fecha, detalle: detalle || undefined,
          registrarEnCaja: registrar && !!cuentaId, cuentaId: registrar ? cuentaId : undefined,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "Error"); return }
      setMonto(""); setDetalle(""); setAbierto(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const eliminar = async (seniaId: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/ordenes-compra/${ordenId}/senias/${seniaId}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "Error"); return }
      setConfirmDel(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#7C3AED]/25 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
        <h3 className="font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <HandCoins className="size-4 text-[#7C3AED]" /> Señas / entregas a cuenta
        </h3>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md bg-[#7C3AED] text-white px-3 py-1.5 text-sm font-medium hover:bg-[#6B2FD6]"
        >
          <Plus className="size-4" /> Registrar seña
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-neutral-800 text-center">
        <div className="px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Precio venta</p>
          <p className="font-bold tabular-nums">{fmt(precioVenta, moneda)}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Señado</p>
          <p className="font-bold tabular-nums text-emerald-600">{fmt(totalSenias, moneda)}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Saldo a cubrir</p>
          <p className={`font-bold tabular-nums ${saldo <= 0 ? "text-emerald-600" : "text-[#CE9F33]"}`}>{fmt(saldo, moneda)}</p>
        </div>
      </div>

      {/* Form de alta */}
      {abierto && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/40 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">Monto ({moneda})</span>
              <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" placeholder="0" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Método</span>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm">
                {METODOS.map((m) => <option key={m} value={m}>{METODO_LABEL[m]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">Detalle (opcional)</span>
            <input value={detalle} onChange={(e) => setDetalle(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" placeholder="Ej: seña para reservar, saldo al retirar" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={registrar} onChange={(e) => setRegistrar(e.target.checked)} className="rounded" />
              <Wallet className="size-4 text-[#7C3AED]" /> Registrar el ingreso en caja
            </label>
            {registrar && (
              <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm">
                {(cuentasMoneda.length ? cuentasMoneda : cuentas).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            <div className="flex-1" />
            <button onClick={() => setAbierto(false)} className="rounded-md border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-sm">Cancelar</button>
            <button onClick={agregar} disabled={busy || !monto} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar seña
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="divide-y divide-gray-50 dark:divide-neutral-800/60">
        {senias.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400 text-center">Sin señas registradas.</p>
        ) : (
          senias.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {fmt(s.monto, s.moneda)} <span className="text-xs font-normal text-gray-500">· {METODO_LABEL[s.metodo] || s.metodo}</span>
                  {s.enCaja && <span className="ml-2 text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">en caja</span>}
                </p>
                <p className="text-xs text-gray-400">{fmtFecha(s.fecha)}{s.detalle ? ` · ${s.detalle}` : ""}</p>
              </div>
              {confirmDel === s.id ? (
                <span className="flex items-center gap-1 shrink-0">
                  <button onClick={() => eliminar(s.id)} disabled={busy} className="inline-flex items-center gap-1 rounded bg-red-600 text-white px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-50">
                    {busy ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Confirmar
                  </button>
                  <button onClick={() => setConfirmDel(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded"><X className="size-4" /></button>
                </span>
              ) : (
                <button onClick={() => setConfirmDel(s.id)} title="Eliminar seña" className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded shrink-0">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

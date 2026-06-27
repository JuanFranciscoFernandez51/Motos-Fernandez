"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Calendar, AlertTriangle, Clock, Settings2, FileText, X, Mail } from "lucide-react"
import { labelTipo } from "@/lib/contador-helpers"
import { ImageUpload } from "@/components/admin/image-upload"

type VencimientoUI = {
  id: string
  tipo: string
  titulo: string
  periodo: string
  fechaVencimiento: string
  monto: number | null
  estado: string
  pagadoEl: string | null
  comprobanteUrl: string | null
  notas: string | null
}
type ObligacionUI = {
  id: string
  tipo: string
  titulo: string
  diaVencimiento: number
  montoEstimado: number | null
  activo: boolean
}

const TIPO_COLOR: Record<string, string> = {
  IVA: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  IIBB: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  CARGAS_SOCIALES: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  MUNICIPAL: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  SINDICATO: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
  OTRO: "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300",
}

const fmtMonto = (n: number | null) => (n != null ? `$ ${n.toLocaleString("es-AR")}` : "—")
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

function diasHasta(iso: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(iso)
  f.setHours(0, 0, 0, 0)
  return Math.round((f.getTime() - hoy.getTime()) / 86400000)
}

export function ContadorClient({
  vencimientos,
  obligaciones,
}: {
  vencimientos: VencimientoUI[]
  obligaciones: ObligacionUI[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [pagando, setPagando] = useState<VencimientoUI | null>(null)
  const [probando, setProbando] = useState(false)

  const probarAviso = async () => {
    setProbando(true)
    try {
      const res = await fetch("/api/admin/contador/probar-aviso", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        alert(`✅ Mail de prueba enviado a ${data.destino}. Revisá tu casilla (y spam).`)
      } else {
        alert(`Error: ${data.error || res.status}`)
      }
    } finally {
      setProbando(false)
    }
  }

  const togglePagado = async (v: VencimientoUI) => {
    setLoading(v.id)
    try {
      await fetch(`/api/admin/contador/vencimiento/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: v.estado === "PAGADO" ? "pendiente" : "pagar" }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const pendientes = vencimientos.filter((v) => v.estado !== "PAGADO")
  const pagados = vencimientos.filter((v) => v.estado === "PAGADO")
  const vencidos = pendientes.filter((v) => diasHasta(v.fechaVencimiento) < 0)
  const totalPendiente = pendientes.reduce((s, v) => s + (v.monto || 0), 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="size-6 text-[#7C3AED]" /> Contador — Vencimientos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tus obligaciones del mes en un solo lugar. Marcá cada una al pagarla.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => setShowConfig((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-[#7C3AED] hover:underline whitespace-nowrap"
          >
            <Settings2 className="size-4" /> Configurar fechas
          </button>
          <button
            onClick={probarAviso}
            disabled={probando}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-50 whitespace-nowrap"
          >
            {probando ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
            Probar aviso por mail
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pendientes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendientes.length}</p>
        </div>
        <div className={`rounded-xl border p-4 ${vencidos.length > 0 ? "border-red-300 dark:border-red-900/40" : "border-gray-200 dark:border-neutral-800"} bg-white dark:bg-neutral-900`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Vencidos</p>
          <p className={`text-2xl font-bold ${vencidos.length > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{vencidos.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">A pagar (est.)</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtMonto(totalPendiente || null)}</p>
        </div>
      </div>

      {/* Config de obligaciones */}
      {showConfig && (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Día de vencimiento de cada obligación (ajustá según tu CUIT / jurisdicción)
          </p>
          {obligaciones.map((o) => (
            <ObligacionRow key={o.id} obligacion={o} onSaved={() => router.refresh()} />
          ))}
          <p className="text-[11px] text-gray-400">
            El día exacto depende de la terminación de tu CUIT (nacionales) y de cada jurisdicción.
            Pedíselos a tu contador y cargalos acá una vez.
          </p>
        </div>
      )}

      {/* Pendientes */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Por pagar</p>
        {pendientes.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">Sin vencimientos pendientes 🎉</p>
        )}
        {pendientes.map((v) => {
          const d = diasHasta(v.fechaVencimiento)
          const urgencia =
            d < 0
              ? { cls: "border-red-300 dark:border-red-900/50", txt: "text-red-600 dark:text-red-400", icon: <AlertTriangle className="size-3.5" />, label: `Vencido hace ${Math.abs(d)}d` }
              : d <= 7
                ? { cls: "border-amber-300 dark:border-amber-900/50", txt: "text-amber-600 dark:text-amber-400", icon: <Clock className="size-3.5" />, label: d === 0 ? "Vence hoy" : `En ${d} día${d === 1 ? "" : "s"}` }
                : { cls: "border-gray-200 dark:border-neutral-800", txt: "text-gray-500 dark:text-gray-400", icon: <Clock className="size-3.5" />, label: `En ${d} días` }
          return (
            <div key={v.id} className={`flex items-center gap-3 rounded-xl border ${urgencia.cls} bg-white dark:bg-neutral-900 p-3`}>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${TIPO_COLOR[v.tipo] || TIPO_COLOR.OTRO}`}>
                {labelTipo(v.tipo)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {v.titulo} <span className="text-gray-400 font-normal">· {v.periodo}</span>
                </p>
                <p className={`text-xs flex items-center gap-1 ${urgencia.txt}`}>
                  {urgencia.icon} {fmtFecha(v.fechaVencimiento)} · {urgencia.label}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">{fmtMonto(v.monto)}</span>
              <button
                onClick={() => setPagando(v)}
                disabled={loading === v.id}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                <Check className="size-3.5" />
                Pagar
              </button>
            </div>
          )
        })}
      </div>

      {/* Pagados */}
      {pagados.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pagados</p>
          {pagados.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/40 p-3 opacity-80">
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${TIPO_COLOR[v.tipo] || TIPO_COLOR.OTRO}`}>
                {labelTipo(v.tipo)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-300 line-through truncate">
                  {v.titulo} <span className="text-gray-400">· {v.periodo}</span>
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Pagado{v.pagadoEl ? ` el ${fmtFecha(v.pagadoEl)}` : ""}
                </p>
              </div>
              {v.comprobanteUrl && (
                <a
                  href={v.comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver comprobante"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <FileText className="size-3.5" /> Boleta
                </a>
              )}
              <span className="text-sm text-gray-500 shrink-0">{fmtMonto(v.monto)}</span>
              <button
                onClick={() => togglePagado(v)}
                disabled={loading === v.id}
                className="shrink-0 text-xs text-gray-400 hover:text-gray-600 px-2"
              >
                {loading === v.id ? <Loader2 className="size-3.5 animate-spin" /> : "Deshacer"}
              </button>
            </div>
          ))}
        </div>
      )}

      {pagando && (
        <PagarModal
          vencimiento={pagando}
          onClose={() => setPagando(null)}
          onDone={() => {
            setPagando(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function PagarModal({
  vencimiento,
  onClose,
  onDone,
}: {
  vencimiento: VencimientoUI
  onClose: () => void
  onDone: () => void
}) {
  const hoyISO = new Date().toISOString().slice(0, 10)
  const [monto, setMonto] = useState(vencimiento.monto ? String(vencimiento.monto) : "")
  const [fecha, setFecha] = useState(hoyISO)
  const [comprobante, setComprobante] = useState("")
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    setSaving(true)
    try {
      await fetch(`/api/admin/contador/vencimiento/${vencimiento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "pagar",
          monto: monto ? Number(monto.replace(/[^\d]/g, "")) : null,
          pagadoEl: fecha,
          comprobanteUrl: comprobante || null,
        }),
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Pagar — {labelTipo(vencimiento.tipo)}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {vencimiento.titulo} · período {vencimiento.periodo}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Monto pagado</label>
            <input
              type="text"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="opcional"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de pago</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            Comprobante / boleta (opcional)
          </label>
          <ImageUpload value={comprobante} onChange={setComprobante} folder="comprobantes-fiscales" />
        </div>

        <div className="flex items-center gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2 text-sm font-bold text-white transition-colors"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  )
}

function ObligacionRow({ obligacion, onSaved }: { obligacion: ObligacionUI; onSaved: () => void }) {
  const [dia, setDia] = useState(String(obligacion.diaVencimiento))
  const [monto, setMonto] = useState(obligacion.montoEstimado ? String(obligacion.montoEstimado) : "")
  const [activo, setActivo] = useState(obligacion.activo)
  const [saving, setSaving] = useState(false)

  const guardar = async (patch: Record<string, unknown>) => {
    setSaving(true)
    try {
      await fetch(`/api/admin/contador/obligacion/${obligacion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TIPO_COLOR[obligacion.tipo] || TIPO_COLOR.OTRO} w-32 shrink-0`}>
        {obligacion.titulo}
      </span>
      <label className="text-xs text-gray-500 dark:text-gray-400">Día</label>
      <input
        type="number"
        min={1}
        max={31}
        value={dia}
        onChange={(e) => setDia(e.target.value)}
        onBlur={() => Number(dia) !== obligacion.diaVencimiento && guardar({ diaVencimiento: Number(dia) })}
        className="w-16 px-2 py-1 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
      />
      <label className="text-xs text-gray-500 dark:text-gray-400">Monto est.</label>
      <input
        type="text"
        inputMode="numeric"
        value={monto}
        placeholder="opcional"
        onChange={(e) => setMonto(e.target.value)}
        onBlur={() => guardar({ montoEstimado: monto ? Number(monto.replace(/[^\d]/g, "")) : null })}
        className="w-28 px-2 py-1 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
      />
      <label className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => {
            setActivo(e.target.checked)
            guardar({ activo: e.target.checked })
          }}
          className="accent-[#7C3AED]"
        />
        Activa
      </label>
      {saving && <Loader2 className="size-3.5 animate-spin text-gray-400" />}
    </div>
  )
}

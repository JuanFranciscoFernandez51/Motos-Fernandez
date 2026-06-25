"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Wifi,
  Receipt,
} from "lucide-react"

// ---- Constantes (espejo de lib/afip/tipos) ----
const IVA_OPCIONES = [
  { id: 5, label: "21%", pct: 21 },
  { id: 4, label: "10,5%", pct: 10.5 },
  { id: 3, label: "0% / Exento", pct: 0 },
]
const COND_IVA_OPCIONES = [
  { id: 5, label: "Consumidor Final" },
  { id: 1, label: "Responsable Inscripto" },
  { id: 6, label: "Monotributo" },
  { id: 4, label: "Exento" },
]
const DOC_OPCIONES = [
  { id: 96, label: "DNI" },
  { id: 80, label: "CUIT" },
  { id: 99, label: "Consumidor Final" },
]

function letraDe(condIva: number) {
  return condIva === 1 ? "A" : "B"
}

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

type FacturaUI = {
  id: string
  puntoVenta: number
  tipoCbte: number
  numero: number | null
  fechaCbte: string
  receptorNombre: string
  docNro: string
  impTotal: number
  estado: string
  cae: string | null
  caeVto: string | null
}

type Item = { descripcion: string; cantidad: number; precioUnit: number; alicuotaIva: number }

const LETRA_CBTE: Record<number, string> = { 1: "A", 6: "B", 11: "C" }

export function FacturacionClient({ facturas }: { facturas: FacturaUI[] }) {
  const router = useRouter()

  // Receptor
  const [docTipo, setDocTipo] = useState(96)
  const [docNro, setDocNro] = useState("")
  const [nombre, setNombre] = useState("")
  const [domicilio, setDomicilio] = useState("")
  const [condIva, setCondIva] = useState(5)
  const [buscando, setBuscando] = useState(false)

  // Ítems
  const [items, setItems] = useState<Item[]>([
    { descripcion: "", cantidad: 1, precioUnit: 0, alicuotaIva: 5 },
  ])

  // Estado de emisión
  const [emitiendo, setEmitiendo] = useState(false)
  const [resultado, setResultado] = useState<
    | { ok: true; numero: number; cae: string; facturaId: string }
    | { ok: false; error: string }
    | null
  >(null)

  // Conexión
  const [conexion, setConexion] = useState<string | null>(null)
  const [probandoConexion, setProbandoConexion] = useState(false)

  // ---- Totales en vivo ----
  const totales = useMemo(() => {
    let neto = 0
    let iva = 0
    for (const it of items) {
      const bruto = (it.cantidad || 0) * (it.precioUnit || 0)
      const pct = IVA_OPCIONES.find((o) => o.id === it.alicuotaIva)?.pct ?? 0
      const n = pct > 0 ? bruto / (1 + pct / 100) : bruto
      neto += n
      iva += bruto - n
    }
    return { neto, iva, total: neto + iva }
  }, [items])

  const buscarPadron = async () => {
    if (!docNro.trim()) return
    setBuscando(true)
    try {
      const res = await fetch(`/api/admin/facturacion/padron?cuit=${docNro.replace(/\D/g, "")}`)
      const d = await res.json()
      if (d.ok) {
        setNombre(d.nombre || "")
        setDomicilio(
          [d.domicilio, d.localidad, d.provincia].filter(Boolean).join(", ") || ""
        )
        setDocTipo(80)
      } else {
        alert(d.error || "No se encontró el CUIT en el padrón")
      }
    } finally {
      setBuscando(false)
    }
  }

  const probarConexion = async () => {
    setProbandoConexion(true)
    setConexion(null)
    try {
      const res = await fetch("/api/admin/facturacion/health")
      const d = await res.json()
      setConexion(
        d.ok
          ? `✅ Conectado · PV ${d.puntoVenta} · próx. Factura A N°${d.proximaFacturaA} / B N°${d.proximaFacturaB}`
          : `⚠️ ${d.error || "Sin conexión"}`
      )
    } catch {
      setConexion("⚠️ Error de red")
    } finally {
      setProbandoConexion(false)
    }
  }

  const setItem = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const addItem = () =>
    setItems((prev) => [...prev, { descripcion: "", cantidad: 1, precioUnit: 0, alicuotaIva: 5 }])
  const delItem = (i: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const puedeEmitir =
    nombre.trim() &&
    docNro.trim() &&
    items.some((it) => it.descripcion.trim() && it.precioUnit > 0) &&
    !emitiendo

  const emitir = async () => {
    if (!puedeEmitir) return
    const letra = letraDe(condIva)
    if (
      !confirm(
        `Vas a emitir una FACTURA ${letra} por $ ${fmt(totales.total)} a nombre de ${nombre}.\n\n` +
          `Esto genera un comprobante FISCAL REAL ante ARCA (no se puede borrar, solo anular con nota de crédito).\n\n¿Confirmás?`
      )
    )
      return

    setEmitiendo(true)
    setResultado(null)
    try {
      const res = await fetch("/api/admin/facturacion/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docTipo,
          docNro: docNro.replace(/\D/g, ""),
          receptorNombre: nombre.trim(),
          receptorDomicilio: domicilio.trim() || null,
          condIvaReceptorId: condIva,
          items: items
            .filter((it) => it.descripcion.trim() && it.precioUnit > 0)
            .map((it) => ({
              descripcion: it.descripcion.trim(),
              cantidad: Number(it.cantidad) || 1,
              precioUnit: Number(it.precioUnit) || 0,
              alicuotaIva: it.alicuotaIva,
            })),
        }),
      })
      const d = await res.json()
      if (d.ok) {
        setResultado({ ok: true, numero: d.numero, cae: d.cae, facturaId: d.facturaId })
        // Reset del form
        setItems([{ descripcion: "", cantidad: 1, precioUnit: 0, alicuotaIva: 5 }])
        setNombre("")
        setDocNro("")
        setDomicilio("")
        router.refresh()
      } else {
        setResultado({ ok: false, error: d.error || "ARCA rechazó el comprobante" })
      }
    } catch (e) {
      setResultado({ ok: false, error: e instanceof Error ? e.message : "Error de red" })
    } finally {
      setEmitiendo(false)
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-violet-600" /> Facturación electrónica
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Emití Factura A/B con CAE de ARCA. Punto de venta 0003 (Web Services).
          </p>
        </div>
        <button
          onClick={probarConexion}
          disabled={probandoConexion}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
        >
          {probandoConexion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          Probar conexión
        </button>
      </div>
      {conexion && (
        <div className="text-sm rounded-lg bg-gray-50 dark:bg-neutral-800/60 px-3 py-2">{conexion}</div>
      )}

      {/* ---- Form de emisión ---- */}
      <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-5 shadow-sm">
        <h2 className="font-semibold text-lg">Nueva factura</h2>

        {/* Receptor */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Receptor</p>
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3">
            <select value={docTipo} onChange={(e) => setDocTipo(Number(e.target.value))} className={inputCls}>
              {DOC_OPCIONES.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <input
              value={docNro}
              onChange={(e) => setDocNro(e.target.value)}
              placeholder="N° de documento / CUIT"
              className={inputCls}
            />
            <button
              onClick={buscarPadron}
              disabled={buscando || docNro.replace(/\D/g, "").length !== 11}
              title="Buscar en el padrón de ARCA (solo CUIT de 11 dígitos)"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-neutral-800 px-3 py-2 text-sm hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50"
            >
              {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Padrón
            </button>
          </div>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre / Razón social"
            className={inputCls}
          />
          <input
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            placeholder="Domicilio (opcional)"
            className={inputCls}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <select value={condIva} onChange={(e) => setCondIva(Number(e.target.value))} className={inputCls}>
              {COND_IVA_OPCIONES.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <div className="text-sm">
              Se emitirá:{" "}
              <span className="font-bold text-violet-600 dark:text-violet-400">Factura {letraDe(condIva)}</span>
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ítems <span className="normal-case font-normal">(precio con IVA incluido)</span>
          </p>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_120px_110px_auto] gap-2 items-center">
              <input
                value={it.descripcion}
                onChange={(e) => setItem(i, { descripcion: e.target.value })}
                placeholder="Descripción (ej: Moto Honda XR 150 usada)"
                className={inputCls}
              />
              <input
                type="number"
                min={1}
                value={it.cantidad}
                onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })}
                className={inputCls}
                title="Cantidad"
              />
              <input
                type="number"
                min={0}
                value={it.precioUnit || ""}
                onChange={(e) => setItem(i, { precioUnit: Number(e.target.value) })}
                placeholder="Precio"
                className={inputCls}
                title="Precio unitario con IVA"
              />
              <select
                value={it.alicuotaIva}
                onChange={(e) => setItem(i, { alicuotaIva: Number(e.target.value) })}
                className={inputCls}
              >
                {IVA_OPCIONES.map((o) => (
                  <option key={o.id} value={o.id}>IVA {o.label}</option>
                ))}
              </select>
              <button
                onClick={() => delItem(i)}
                className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
                disabled={items.length === 1}
                title="Quitar ítem"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:underline"
          >
            <Plus className="w-4 h-4" /> Agregar ítem
          </button>
        </div>

        {/* Totales */}
        <div className="flex flex-col items-end gap-1 border-t border-gray-100 dark:border-neutral-800 pt-3 text-sm">
          <div className="text-gray-500">Neto: $ {fmt(totales.neto)}</div>
          <div className="text-gray-500">IVA: $ {fmt(totales.iva)}</div>
          <div className="text-lg font-bold">Total: $ {fmt(totales.total)}</div>
        </div>

        {/* Emitir */}
        <button
          onClick={emitir}
          disabled={!puedeEmitir}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 text-white py-3 font-semibold hover:bg-violet-700 disabled:opacity-40"
        >
          {emitiendo ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          {emitiendo ? "Emitiendo en ARCA…" : `Emitir Factura ${letraDe(condIva)}`}
        </button>

        {/* Resultado */}
        {resultado?.ok && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-300">
              <CheckCircle2 className="w-5 h-5" /> ¡Factura emitida! N° {resultado.numero}
            </div>
            <div className="text-sm mt-1">CAE: <span className="font-mono">{resultado.cae}</span></div>
            <a
              href={`/api/admin/facturacion/${resultado.facturaId}/pdf`}
              target="_blank"
              className="inline-flex items-center gap-1 mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              <FileText className="w-4 h-4" /> Descargar PDF
            </a>
          </div>
        )}
        {resultado && !resultado.ok && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            <div><strong>ARCA rechazó el comprobante:</strong> {resultado.error}</div>
          </div>
        )}
      </div>

      {/* ---- Lista de comprobantes ---- */}
      <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
        <h2 className="font-semibold text-lg mb-3">Últimos comprobantes</h2>
        {facturas.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no emitiste ninguna factura.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-neutral-800">
                  <th className="py-2 pr-3">Comprobante</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Receptor</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} className="border-b border-gray-50 dark:border-neutral-800/60">
                    <td className="py-2 pr-3 font-medium">
                      Factura {LETRA_CBTE[f.tipoCbte] || "?"}{" "}
                      {f.numero != null && (
                        <span className="text-gray-400">
                          {String(f.puntoVenta).padStart(4, "0")}-{String(f.numero).padStart(8, "0")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{fmtFecha(f.fechaCbte)}</td>
                    <td className="py-2 pr-3">{f.receptorNombre}</td>
                    <td className="py-2 pr-3 text-right">$ {fmt(f.impTotal)}</td>
                    <td className="py-2 pr-3">
                      {f.estado === "EMITIDA" ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Emitida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> {f.estado === "RECHAZADA" ? "Rechazada" : f.estado}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {f.estado === "EMITIDA" && f.cae && (
                        <a
                          href={`/api/admin/facturacion/${f.id}/pdf`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          <FileText className="w-4 h-4" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

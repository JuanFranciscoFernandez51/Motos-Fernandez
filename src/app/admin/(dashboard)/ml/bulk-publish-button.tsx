"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, CheckCircle2, XCircle } from "lucide-react"

type Item = {
  id: string
  marca: string
  nombre: string
  anio?: number | null
}

type ResultadoItem = {
  id: string
  label: string
  ok: boolean
  error?: string
}

const TIPO_LABELS: Record<string, string> = {
  free: "Gratis",
  silver: "Plata ($)",
  gold: "Oro ($$)",
  gold_premium: "Oro Premium ($$$)",
}

/**
 * Botón para publicar/actualizar varias motos en ML en lote (secuencial).
 * Antes de publicar, opcionalmente fuerza un listing_type para todas
 * (útil cuando se agotó el cupo de "free" del mes y querés mandar todas
 * como silver/gold). Hace POST a /api/admin/ml/publish/[id] una por una,
 * con pausa entre cada llamada para no superar rate-limits.
 */
export function BulkPublishButton({
  pendientes,
  label = "Publicar todas las pendientes",
}: {
  pendientes: Item[]
  label?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [tipoOverride, setTipoOverride] = useState<string>("free")
  const [progreso, setProgreso] = useState({ done: 0, total: 0 })
  const [resultados, setResultados] = useState<ResultadoItem[]>([])
  const [warning, setWarning] = useState<string | null>(null)

  const handleClick = async () => {
    if (running) return
    if (pendientes.length === 0) return
    const tipoLabel = TIPO_LABELS[tipoOverride] || tipoOverride
    if (
      !confirm(
        `Vas a publicar ${pendientes.length} motos en Mercado Libre como "${tipoLabel}".\n¿Confirmás?`
      )
    ) {
      return
    }
    setRunning(true)
    setResultados([])
    setWarning(null)
    setProgreso({ done: 0, total: pendientes.length })

    // 1) Setear listing_type a TODAS antes de publicar (un solo POST)
    try {
      const res = await fetch(`/api/admin/ml/listing-type/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: pendientes.map((m) => m.id),
          tipo: tipoOverride,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setWarning(
          `No se pudo aplicar el tipo "${tipoLabel}" en lote: ${
            data.error || res.status
          }. Sigo con el tipo guardado de cada moto.`
        )
      }
    } catch (e) {
      setWarning(
        `No se pudo aplicar el tipo "${tipoLabel}" en lote: ${
          e instanceof Error ? e.message : "error de red"
        }. Sigo con el tipo guardado de cada moto.`
      )
    }

    // 2) Publicar una por una
    const acumulado: ResultadoItem[] = []
    for (let i = 0; i < pendientes.length; i++) {
      const m = pendientes[i]
      const itemLabel = `${m.marca} ${m.nombre}${m.anio ? ` ${m.anio}` : ""}`
      try {
        const res = await fetch(`/api/admin/ml/publish/${m.id}`, {
          method: "POST",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) {
          acumulado.push({
            id: m.id,
            label: itemLabel,
            ok: false,
            error: data.error || `HTTP ${res.status}`,
          })
        } else {
          acumulado.push({ id: m.id, label: itemLabel, ok: true })
        }
      } catch (e) {
        acumulado.push({
          id: m.id,
          label: itemLabel,
          ok: false,
          error: e instanceof Error ? e.message : "Error de conexión",
        })
      }
      setResultados([...acumulado])
      setProgreso({ done: i + 1, total: pendientes.length })
      if (i < pendientes.length - 1) {
        await new Promise((r) => setTimeout(r, 1200))
      }
    }

    setRunning(false)
    startTransition(() => router.refresh())
  }

  const exitosas = resultados.filter((r) => r.ok).length
  const fallidas = resultados.filter((r) => !r.ok).length

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-600 dark:text-gray-400">
          Tipo:
        </label>
        <select
          value={tipoOverride}
          onChange={(e) => setTipoOverride(e.target.value)}
          disabled={running || isPending}
          className="text-xs h-8 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 cursor-pointer disabled:opacity-50"
          title="Tipo de publicación que se aplicará a todas las motos antes de publicarlas"
        >
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleClick}
          disabled={running || isPending || pendientes.length === 0}
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-[#FFE600] text-[#2D3277] hover:bg-[#fff04d] font-semibold disabled:opacity-50"
        >
          {running || isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {running
            ? `Publicando ${progreso.done}/${progreso.total}...`
            : `${label} (${pendientes.length})`}
        </button>
      </div>

      {warning && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">
          {warning}
        </p>
      )}

      {resultados.length > 0 && (
        <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-1.5 text-xs max-h-64 overflow-y-auto">
          <div className="flex items-center gap-3 pb-1.5 border-b border-gray-100 dark:border-neutral-800 text-[11px] font-medium">
            <span className="text-green-700 dark:text-green-300">
              ✓ {exitosas} OK
            </span>
            {fallidas > 0 && (
              <span className="text-red-700 dark:text-red-300">
                ✗ {fallidas} con error
              </span>
            )}
            {running && (
              <span className="text-gray-500 dark:text-gray-400">
                {progreso.done} / {progreso.total}
              </span>
            )}
          </div>
          {resultados.map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              {r.ok ? (
                <CheckCircle2 className="size-3.5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="size-3.5 text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.label}</p>
                {r.error && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 break-all leading-tight">
                    {r.error.length > 200
                      ? r.error.slice(0, 197) + "..."
                      : r.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

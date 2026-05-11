"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { InstagramIcon } from "@/components/icons/social"

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

/**
 * Publica varias motos en IG + FB en lote, una por una con pausa de 3s.
 * NO podés publicar más de 30 por lote (rate limit de IG). Muestra
 * progreso real (no estimado): consulta el endpoint sincrono y va
 * mostrando los resultados parciales si llegamos a streamear en el futuro.
 *
 * Por ahora: spinner mientras procesa, listado al final con OK/error.
 */
export function MetaBulkPublishButton({ pendientes }: { pendientes: Item[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [resultados, setResultados] = useState<ResultadoItem[]>([])

  const handleClick = async () => {
    if (running) return
    if (pendientes.length === 0) return
    if (pendientes.length > 30) {
      alert(
        `Demasiadas motos para un solo lote (${pendientes.length}). IG tiene rate limit. Hacelo en tandas de 30.`
      )
      return
    }
    if (
      !confirm(
        `Vas a publicar ${pendientes.length} motos en Instagram + Facebook. Va a tardar ~${Math.ceil(pendientes.length * 30 / 60)} min (3s entre cada una + ~30s de procesamiento por moto).\n\n¿Confirmás?`
      )
    ) {
      return
    }
    setRunning(true)
    setResultados([])
    try {
      const res = await fetch("/api/admin/meta/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendientes.map((m) => m.id) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(`Error: ${data.error || res.status}`)
        return
      }
      // Mapear resultados con labels
      const conLabel: ResultadoItem[] = (data.resultados || []).map(
        (r: { id: string; ok: boolean; error?: string }) => {
          const moto = pendientes.find((p) => p.id === r.id)
          return {
            id: r.id,
            label: moto
              ? `${moto.marca} ${moto.nombre}${moto.anio ? ` ${moto.anio}` : ""}`
              : r.id,
            ok: r.ok,
            error: r.error,
          }
        }
      )
      setResultados(conLabel)
      startTransition(() => router.refresh())
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : "red"}`)
    } finally {
      setRunning(false)
    }
  }

  const exitosas = resultados.filter((r) => r.ok).length
  const fallidas = resultados.filter((r) => !r.ok).length

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={running || isPending || pendientes.length === 0}
        className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 font-semibold disabled:opacity-50"
      >
        {running || isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <InstagramIcon className="size-4" />
        )}
        {running
          ? `Publicando ${pendientes.length} motos...`
          : `Publicar todas las pendientes (${pendientes.length})`}
      </button>

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
                    {r.error.length > 200 ? r.error.slice(0, 197) + "..." : r.error}
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

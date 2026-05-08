"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"

/**
 * Botón que consulta a ML el estado actual de cada publicación y lo
 * actualiza en nuestro DB. No modifica nada en ML — solo lee. Sirve
 * cuando el cache local quedó viejo (ej: ML pasó motos a under_review
 * o de under_review a active y nuestro UI sigue mostrando el estado anterior).
 */
export function RefreshStatusButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [resumen, setResumen] = useState<string | null>(null)

  const handleClick = async () => {
    if (running) return
    setRunning(true)
    setResumen(null)
    try {
      const res = await fetch("/api/admin/ml/refresh-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setResumen(`Error: ${data.error || res.status}`)
      } else {
        setResumen(
          `${data.actualizadas}/${data.total} actualizadas${
            data.errores ? ` (${data.errores} con error)` : ""
          }`
        )
        startTransition(() => router.refresh())
      }
    } catch (e) {
      setResumen(`Error: ${e instanceof Error ? e.message : "red"}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={running || isPending}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
        title="Consulta a ML el estado real de cada publicación y refresca el cache local"
      >
        {running || isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RotateCcw className="size-3.5" />
        )}
        {running ? "Refrescando..." : "Refrescar estado"}
      </button>
      {resumen && (
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {resumen}
        </span>
      )}
    </div>
  )
}

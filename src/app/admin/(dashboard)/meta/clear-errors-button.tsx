"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eraser } from "lucide-react"

/** Limpia los errores de IG/FB sin afectar los posts existentes. */
export function MetaClearErrorsButton({ count }: { count: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)

  const handleClick = async () => {
    if (running) return
    if (!confirm(`Vas a limpiar los ${count} errores guardados. ¿Confirmás?`)) return
    setRunning(true)
    try {
      const res = await fetch("/api/admin/meta/clear-errors", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Error: ${data.error || res.status}`)
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : "red"}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={running || isPending || count === 0}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
    >
      {running || isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Eraser className="size-3.5" />
      )}
      {running ? "Limpiando..." : "Limpiar errores"}
    </button>
  )
}

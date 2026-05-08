"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"

/**
 * Botón client-side para publicar/actualizar una moto en ML.
 * Hace POST al endpoint /api/admin/ml/publish/[id] con credentials de la
 * cookie de admin (que el browser envía automáticamente).
 * Muestra loading, error en tooltip si falla, y refresca la página.
 */
export function PublishButton({
  modeloId,
  yaPublicada,
}: {
  modeloId: string
  yaPublicada: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ml/publish/${modeloId}`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      // OK: refrescar la lista
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || isPending}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-[#FFE600] text-[#2D3277] hover:bg-[#fff04d] font-medium disabled:opacity-50"
      >
        {loading || isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : yaPublicada ? (
          <RefreshCw className="size-3" />
        ) : null}
        {yaPublicada ? "Actualizar" : "Publicar"}
      </button>
      {error && (
        <span
          className="inline-flex items-center text-red-600 cursor-help"
          title={error}
        >
          <AlertCircle className="size-4" />
        </span>
      )}
    </div>
  )
}

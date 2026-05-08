"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RefreshCw, AlertCircle, RotateCcw } from "lucide-react"

const TIPO_LABELS: Record<string, string> = {
  free: "Gratis",
  silver: "Plata ($)",
  gold: "Oro ($$)",
  gold_premium: "Oro Premium ($$$)",
}

/**
 * Botón client-side para publicar/actualizar una moto en ML.
 * Hace POST al endpoint /api/admin/ml/publish/[id] con credentials de la
 * cookie de admin (que el browser envía automáticamente).
 * Muestra loading, error en tooltip si falla, y refresca la página.
 */
export function PublishButton({
  modeloId,
  yaPublicada,
  listingType: initialType = "free",
}: {
  modeloId: string
  yaPublicada: boolean
  listingType?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listingType, setListingType] = useState(initialType)

  const handleTypeChange = async (nuevo: string) => {
    setListingType(nuevo)
    // Persistir el cambio sin publicar todavia
    await fetch(`/api/admin/ml/listing-type/${modeloId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: nuevo }),
    }).catch(() => null)
  }

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

  const handleRepublicar = async () => {
    if (
      !confirm(
        "Va a CERRAR la publicación actual y crear una NUEVA con los datos actuales (descripción, precio, etc).\n\n⚠️ Pierde antigüedad, visitas y favoritos acumulados.\n\nUsalo solo si no podés actualizar la descripción de otra forma. ¿Confirmás?"
      )
    ) {
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/ml/publish/${modeloId}?action=republish`,
        { method: "POST" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1 max-w-[300px]">
      <div className="inline-flex items-center gap-1">
        <select
          value={listingType}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={loading || isPending}
          className="text-xs h-7 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-1 cursor-pointer disabled:opacity-50"
          title="Tipo de publicación en ML (gratis o pago)"
        >
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
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
        {yaPublicada && (
          <button
            type="button"
            onClick={handleRepublicar}
            disabled={loading || isPending}
            className="inline-flex items-center justify-center size-7 rounded-md border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
            title="Re-publicar (cierra la actual y crea una nueva con datos actualizados). Pierde antigüedad — usar solo si necesitás cambiar descripción."
          >
            <RotateCcw className="size-3" />
          </button>
        )}
        {error && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(error).catch(() => null)
              alert(error)
            }}
            className="inline-flex items-center text-red-600 hover:text-red-700"
            title="Click para copiar / ver error completo"
          >
            <AlertCircle className="size-4" />
          </button>
        )}
      </div>
      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400 break-all leading-tight text-right">
          {error.length > 120 ? error.slice(0, 117) + "..." : error}
        </p>
      )}
    </div>
  )
}

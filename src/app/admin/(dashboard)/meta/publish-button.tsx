"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, RotateCcw } from "lucide-react"
import { InstagramIcon } from "@/components/icons/social"

/**
 * Botón cliente para publicar una moto en IG/FB. Si ya está publicada
 * (yaPublicada=true), muestra ícono de reciclar para forzar republicación.
 */
export function MetaPublishButton({
  modeloId,
  yaPublicada,
  sinFoto = false,
}: {
  modeloId: string
  yaPublicada: boolean
  sinFoto?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async (force: boolean) => {
    if (force) {
      if (
        !confirm(
          "Vas a re-publicar esta moto en IG/FB. Se va a crear un POST NUEVO (no se borra el viejo).\n\n¿Confirmás?"
        )
      ) {
        return
      }
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/meta/publish/${modeloId}${force ? "?force=1" : ""}`,
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
        <button
          type="button"
          onClick={() => handleClick(false)}
          disabled={loading || isPending || yaPublicada || (sinFoto && !yaPublicada)}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 font-medium disabled:opacity-50"
          title={
            sinFoto && !yaPublicada
              ? "Esta moto no tiene foto: cargá una antes de publicar"
              : yaPublicada
                ? "Ya está publicada — usá el botón de re-publicar si querés crear un post nuevo"
                : "Publicar en Instagram + Facebook"
          }
        >
          {loading || isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <InstagramIcon className="size-3" />
          )}
          {sinFoto && !yaPublicada ? "Sin foto" : yaPublicada ? "Publicada" : "Publicar"}
        </button>
        {yaPublicada && (
          <button
            type="button"
            onClick={() => handleClick(true)}
            disabled={loading || isPending}
            className="inline-flex items-center justify-center size-7 rounded-md border border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
            title="Re-publicar (crea un post nuevo). El viejo no se toca."
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

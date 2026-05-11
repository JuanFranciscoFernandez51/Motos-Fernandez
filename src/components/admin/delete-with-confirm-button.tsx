"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react"

/**
 * Botón "Eliminar" con confirmación tipo modal.
 *
 * Flujo:
 *  1. Click → abre modal con mensaje de advertencia.
 *  2. Click "Sí, eliminar" → DELETE al endpoint + refresh.
 *  3. Click "Cancelar" → cierra modal.
 *
 * Reusable para clientes, OCs, mandatos, OTs.
 */
export function DeleteWithConfirmButton({
  deleteUrl,
  label,
  extraWarning,
  variant = "icon",
  redirectTo,
}: {
  deleteUrl: string
  label: string // ej "OC-0042 — Honda CRF 250"
  extraWarning?: string // mensaje adicional (ej "Esta acción borra también las permutas asociadas")
  variant?: "icon" | "button"
  redirectTo?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Error ${res.status}`)
        return
      }
      setOpen(false)
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        startTransition(() => router.refresh())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setOpen(true)
          }}
          className="inline-flex items-center justify-center size-8 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          title="Eliminar"
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          <Trash2 className="size-4" />
          Eliminar
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                <h3 className="font-semibold">¿Estás seguro?</h3>
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
                disabled={loading}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <p>
                Vas a eliminar <strong className="font-semibold">{label}</strong>.
                <br />
                Esta acción <strong className="text-red-600">no se puede deshacer</strong>.
              </p>
              {extraWarning && (
                <p className="rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 px-3 py-2 text-xs text-amber-900 dark:text-amber-300">
                  ⚠ {extraWarning}
                </p>
              )}
              {error && (
                <p className="rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-neutral-800 px-5 py-3">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
              >
                No, cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading || isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

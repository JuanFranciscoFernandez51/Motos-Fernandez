"use client"

import { useEffect, useState, useTransition } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  modelo: { id: string; nombre: string; slug: string } | null
  deleteModelo: (id: string, confirmText: string) => Promise<void>
}

export function DeleteModal({ open, onClose, modelo, deleteModelo }: Props) {
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setConfirmText("")
      setError(null)
    }
  }, [open, modelo])

  if (!open || !modelo) return null

  const expected = `eliminar ${modelo.nombre}`.toLowerCase().trim()
  const given = confirmText.toLowerCase().trim()
  const matches = given === expected

  const handleDelete = () => {
    if (!matches) {
      setError("La confirmación no coincide")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await deleteModelo(modelo.id, confirmText)
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar")
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-600">
              Eliminar definitivamente
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
            disabled={isPending}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3">
            <p className="text-sm text-red-800 dark:text-red-300">
              Esta acción es <strong>irreversible</strong>. Se va a eliminar la
              moto y todas sus fotos, datos internos y registros asociados.
            </p>
            <p className="mt-2 text-sm text-red-900 dark:text-red-300">
              Moto: <strong>{modelo.nombre}</strong>{" "}
              <span className="font-mono text-xs uppercase">
                ({modelo.slug})
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Para confirmar, escribí:{" "}
              <code className="rounded bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-gray-800 dark:text-gray-100">
                eliminar {modelo.nombre}
              </code>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError(null)
              }}
              placeholder={`eliminar ${modelo.nombre}`}
              autoFocus
              disabled={isPending}
              className="mt-2 w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
            />
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-neutral-800 px-5 py-3 bg-gray-50 dark:bg-neutral-900 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!matches || isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="size-3 animate-spin" />}
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  )
}

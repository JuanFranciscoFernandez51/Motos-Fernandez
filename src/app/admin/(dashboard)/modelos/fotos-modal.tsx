"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { X, Check, Loader2 } from "lucide-react"
import { MultiImageUpload } from "@/components/admin/multi-image-upload"

type Props = {
  open: boolean
  onClose: () => void
  modelo: { id: string; nombre: string; slug: string; fotos: string[] } | null
  updateFotos: (id: string, fotos: string[]) => Promise<void>
}

export function FotosModal({ open, onClose, modelo, updateFotos }: Props) {
  const [fotos, setFotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const lastSavedRef = useRef<string>("")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset fotos cuando cambia de modelo
  useEffect(() => {
    if (modelo) {
      setFotos(modelo.fotos)
      lastSavedRef.current = JSON.stringify(modelo.fotos)
      setSavedAt(null)
    }
  }, [modelo])

  // Auto-save con debounce cuando cambian las fotos
  useEffect(() => {
    if (!modelo) return
    const currentSerialized = JSON.stringify(fotos)
    if (currentSerialized === lastSavedRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setSaving(true)
      startTransition(async () => {
        try {
          await updateFotos(modelo.id, fotos)
          lastSavedRef.current = currentSerialized
          setSavedAt(Date.now())
        } finally {
          setSaving(false)
        }
      })
    }, 600)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [fotos, modelo, updateFotos])

  if (!open || !modelo) return null

  const justSaved = savedAt && Date.now() - savedAt < 2500

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-10 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Fotos — {modelo.nombre}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase">
              {modelo.slug}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(saving || isPending) && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="size-3 animate-spin" />
                Guardando...
              </span>
            )}
            {justSaved && !saving && !isPending && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <Check className="size-3" />
                Guardado
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-600 dark:text-gray-300"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Arrastrá las fotos para subir. La primera se usa como portada.
            Los cambios se guardan automáticamente.
          </p>
          <MultiImageUpload
            value={fotos}
            onChange={setFotos}
            folder="motos-fernandez/modelos"
          />
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 px-5 py-3 bg-gray-50 dark:bg-neutral-900 rounded-b-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {fotos.length} foto{fotos.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={onClose}
            className="rounded-md bg-[#6B4F7A] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#8B6F9A]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

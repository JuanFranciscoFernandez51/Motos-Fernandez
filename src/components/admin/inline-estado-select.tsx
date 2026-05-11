"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type EstadoOption = {
  value: string
  label: string
  className: string // clases Tailwind para el badge
}

/**
 * Selector inline de estado. Muestra un Badge clickeable; al hacer click
 * se transforma en un <select> y al cambiar el valor manda PATCH al
 * endpoint y refresca la lista.
 *
 * No requiere modal — la confirmación visual es la actualización
 * inmediata del color del badge. Si el usuario quiere revertir, vuelve
 * a clickear y elige el estado anterior.
 */
export function InlineEstadoSelect({
  estadoActual,
  options,
  patchUrl,
  disabled,
}: {
  estadoActual: string
  options: EstadoOption[]
  patchUrl: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actual = options.find((o) => o.value === estadoActual)

  const handleChange = async (nuevo: string) => {
    if (nuevo === estadoActual) {
      setEditing(false)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(patchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevo }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Error ${res.status}`)
        return
      }
      setEditing(false)
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => !disabled && setEditing(true)}
        disabled={disabled || loading || isPending}
        className="inline-block disabled:opacity-50"
        title={disabled ? "" : "Click para cambiar estado"}
      >
        {loading || isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Badge variant="secondary" className={actual?.className}>
            {actual?.label || estadoActual}
          </Badge>
        )}
        {error && (
          <p className="text-[10px] text-red-600 mt-0.5 max-w-[140px] truncate">
            {error}
          </p>
        )}
      </button>
    )
  }

  return (
    <select
      autoFocus
      value={estadoActual}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => setEditing(false)}
      disabled={loading}
      className="text-xs h-7 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-1 cursor-pointer disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

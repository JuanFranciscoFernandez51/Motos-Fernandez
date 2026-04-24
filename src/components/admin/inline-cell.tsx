"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Check, Pencil, X, Loader2 } from "lucide-react"

type CommonProps = {
  onSave: (value: string) => Promise<void>
  className?: string
  placeholder?: string
}

/**
 * Celda de texto editable con doble click o click en lápiz.
 * Guarda con Enter o blur. Cancela con Esc.
 */
export function InlineTextCell({
  value,
  onSave,
  className = "",
  placeholder,
  display,
}: CommonProps & {
  value: string
  display?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    if (draft === value) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      await onSave(draft)
      setEditing(false)
    })
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            }
            if (e.key === "Escape") cancel()
          }}
          placeholder={placeholder}
          disabled={isPending}
          className={`h-8 w-full rounded border border-[#6B4F7A] bg-white px-2 text-sm outline-none ${className}`}
        />
        {isPending && <Loader2 className="size-3 animate-spin text-gray-400 shrink-0" />}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group w-full text-left rounded px-1 -mx-1 py-0.5 hover:bg-[#6B4F7A]/5 transition-colors"
    >
      {display ?? (
        <span className={value ? "" : "text-gray-400 italic"}>
          {value || placeholder || "—"}
        </span>
      )}
      <Pencil className="size-3 ml-1.5 inline opacity-0 group-hover:opacity-50 transition-opacity text-gray-500" />
    </button>
  )
}

/**
 * Celda numérica editable. Guarda un número (o null si vacío).
 */
export function InlineNumberCell({
  value,
  onSave,
  format,
  placeholder,
}: {
  value: number | null
  onSave: (value: number | null) => Promise<void>
  format?: (v: number | null) => React.ReactNode
  placeholder?: string
}) {
  return (
    <InlineTextCell
      value={value != null ? String(value) : ""}
      onSave={async (v) => {
        const trimmed = v.trim()
        const num = trimmed ? parseInt(trimmed) : null
        await onSave(num != null && Number.isFinite(num) ? num : null)
      }}
      placeholder={placeholder}
      display={
        format ? (
          format(value)
        ) : value != null ? (
          value.toLocaleString("es-AR")
        ) : (
          <span className="text-gray-400 italic">—</span>
        )
      }
    />
  )
}

/**
 * Celda con dropdown para valores discretos.
 */
export function InlineSelectCell({
  value,
  options,
  onSave,
  renderValue,
}: {
  value: string
  options: { value: string; label: string }[]
  onSave: (value: string) => Promise<void>
  renderValue?: (value: string) => React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) =>
          startTransition(() => onSave(e.target.value))
        }
        disabled={isPending}
        className="h-8 w-full appearance-none rounded border border-transparent bg-transparent pl-2 pr-6 text-sm hover:border-gray-200 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {renderValue && (
        <div className="pointer-events-none absolute inset-0 flex items-center pl-2">
          {renderValue(value)}
        </div>
      )}
      {isPending && (
        <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 size-3 animate-spin text-gray-400" />
      )}
    </div>
  )
}

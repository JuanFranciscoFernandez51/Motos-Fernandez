"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil } from "lucide-react"

type Props = {
  /** Endpoint a PATCHear (ej: /api/admin/stock-motos/123) */
  endpoint: string
  /** Nombre del campo a actualizar */
  field: string
  /** Valor actual */
  value: string | number | null
  /** Tipo de input */
  type?: "text" | "number"
  /** Opciones para un <select> (en vez de input libre) */
  options?: { value: string; label: string }[]
  /** Cómo se muestra cuando NO se está editando */
  display?: (v: string | number | null) => React.ReactNode
  /** Alinear a la derecha (números) */
  alignRight?: boolean
  placeholder?: string
}

/**
 * Celda editable inline (estilo planilla): un click muestra el input,
 * Enter o salir del foco guarda con PATCH. Esc cancela.
 */
export function InlineEdit({
  endpoint, field, value, type = "text", options, display, alignRight, placeholder = "—",
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState<string>(value == null ? "" : String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => { setVal(value == null ? "" : String(value)) }, [value])
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); if ("select" in inputRef.current) inputRef.current.select?.() } }, [editing])

  async function guardar() {
    const original = value == null ? "" : String(value)
    if (val === original) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: type === "number" ? (val === "" ? null : Number(val)) : val }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Error") }
      toast.success("Guardado")
      setEditing(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    const stop = (e: React.SyntheticEvent) => e.stopPropagation()
    if (options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={val}
          disabled={saving}
          onClick={stop}
          onChange={(e) => setVal(e.target.value)}
          onBlur={guardar}
          className="w-full h-8 rounded border border-[#5BB5C2] px-1.5 text-sm bg-white"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={val}
        disabled={saving}
        onClick={stop}
        onChange={(e) => setVal(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") { setVal(value == null ? "" : String(value)); setEditing(false) } }}
        className={`w-full h-8 rounded border border-[#5BB5C2] px-1.5 text-sm bg-white ${alignRight ? "text-right" : ""}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className={`group/inline inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-[#7ECAD6]/20 ${alignRight ? "justify-end w-full" : ""}`}
      title="Click para editar"
    >
      <span>{display ? display(value) : (value === null || value === "" ? <span className="text-gray-300">{placeholder}</span> : value)}</span>
      <Pencil className="h-3 w-3 text-gray-300 opacity-0 group-hover/inline:opacity-100 shrink-0" />
    </button>
  )
}

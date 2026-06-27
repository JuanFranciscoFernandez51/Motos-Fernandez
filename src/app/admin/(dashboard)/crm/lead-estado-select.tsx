"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

type Opcion = { key: string; label: string; color: string }

/**
 * Select inline (pill de color) para cambiar temperatura o etapa de un lead
 * directo desde la lista del CRM, sin entrar al detalle. Guarda al cambiar.
 */
export function LeadEstadoSelect({
  leadId,
  field,
  value,
  options,
}: {
  leadId: string
  field: "temperatura" | "etapa"
  value: string
  options: Opcion[]
}) {
  const router = useRouter()
  const [val, setVal] = useState(value)
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok">("idle")

  const color = options.find((o) => o.key === val)?.color || "bg-gray-100 text-gray-800"

  const onChange = async (nuevo: string) => {
    if (nuevo === val) return
    const prev = val
    setVal(nuevo)
    setEstado("guardando")
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nuevo }),
      })
      if (!res.ok) {
        setVal(prev)
        setEstado("idle")
        alert("No se pudo guardar el cambio. Probá de nuevo.")
        return
      }
      setEstado("ok")
      router.refresh()
      setTimeout(() => setEstado("idle"), 1500)
    } catch {
      setVal(prev)
      setEstado("idle")
      alert("Error de red al guardar.")
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <select
        value={val}
        disabled={estado === "guardando"}
        onChange={(e) => onChange(e.target.value)}
        title="Cambiar sin entrar al lead"
        className={`text-xs rounded-full border-0 pl-2.5 pr-6 py-1 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7C3AED] appearance-none bg-no-repeat ${color} ${estado === "guardando" ? "opacity-60" : ""}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 0.4rem center",
        }}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key} className="bg-white text-gray-900">
            {o.label}
          </option>
        ))}
      </select>
      {estado === "guardando" && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
      {estado === "ok" && <Check className="h-3 w-3 text-green-600" />}
    </span>
  )
}

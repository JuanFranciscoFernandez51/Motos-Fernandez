"use client"

import { Scale } from "lucide-react"
import { useCompare, type CompareItem } from "./comparador-provider"

interface CompareButtonProps {
  item: CompareItem
  variant?: "icon" | "icon-floating"
  className?: string
}

export function CompareButton({
  item,
  variant = "icon",
  className = "",
}: CompareButtonProps) {
  const { isInCompare, addToCompare, removeFromCompare } = useCompare()
  const active = isInCompare(item.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (active) {
      removeFromCompare(item.id)
    } else {
      addToCompare(item)
    }
  }

  if (variant === "icon-floating") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={active ? "Quitar del comparador" : "Agregar al comparador"}
        title={active ? "Quitar del comparador" : "Comparar modelo"}
        className={`size-9 rounded-full backdrop-blur-sm shadow-sm transition-all flex items-center justify-center ${
          active
            ? "bg-[#7C3AED] text-white hover:bg-[#9D5CF0]"
            : "bg-white/95 dark:bg-neutral-900/95 text-[#7C3AED] hover:bg-white dark:hover:bg-neutral-900"
        } ${className}`}
      >
        <Scale className="size-4" />
      </button>
    )
  }

  // variant === "icon": sin fondo, para detalle
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Quitar del comparador" : "Agregar al comparador"}
      title={active ? "Quitar del comparador" : "Comparar modelo"}
      className={`inline-flex size-10 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#9D5CF0]"
          : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[#7C3AED] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5"
      } ${className}`}
    >
      <Scale className="size-4" />
    </button>
  )
}

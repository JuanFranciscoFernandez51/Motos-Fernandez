"use client"

import { useRef, type ReactNode, type CSSProperties } from "react"

/**
 * SpotlightCard — resplandor radial que sigue el cursor sobre la card
 * (inspirado en el BorderGlow de Cauce, pero liviano y temático violeta).
 * El brillo aparece al hover y se mueve con el mouse. En touch no molesta.
 */
export function SpotlightCard({
  children,
  className = "",
  glow = "124, 58, 237", // violeta MF
  radius = 380,
}: {
  children: ReactNode
  className?: string
  glow?: string
  radius?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - r.left}px`)
    el.style.setProperty("--my", `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`mf-spotlight ${className}`}
      style={
        {
          "--glow": glow,
          "--glow-radius": `${radius}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}

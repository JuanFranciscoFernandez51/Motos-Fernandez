"use client"

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react"

/**
 * TextReveal — revela un texto palabra por palabra (sube con blur, escalonado),
 * como los héroes de Cauce. Sin librerías: usa la clase `.mf-words-word` de
 * globals.css. Arranca cuando entra en viewport (o al toque si no hay JS).
 *
 * Sólo acepta string (para títulos/eyebrows). El estilo del texto se controla
 * con `className` en el elemento contenedor.
 */
export function TextReveal({
  text,
  as: Tag = "span",
  className = "",
  delay = 0,
  once = true,
}: {
  text: string
  as?: ElementType
  className?: string
  /** segundos de arranque base */
  delay?: number
  once?: boolean
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [once])

  const words = text.split(/(\s+)/)

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i}> </span>
        ) : (
          <span
            key={i}
            aria-hidden="true"
            className="mf-words-word"
            style={
              {
                "--i": i,
                "--base": `${delay}s`,
                animationPlayState: visible ? "running" : "paused",
              } as CSSProperties
            }
          >
            {w}
          </span>
        )
      )}
    </Tag>
  )
}

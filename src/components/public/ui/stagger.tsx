"use client"

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react"

/**
 * Stagger — revela los hijos directos en cascada cuando el contenedor entra
 * en viewport (usa `.mf-stagger`/`.is-in` de globals.css). Ideal para grillas
 * de cards. Respeta reduced-motion (se ve estático). Si no hay JS, muestra.
 */
export function Stagger({
  children,
  as: Tag = "div",
  className = "",
  threshold = 0.12,
}: {
  children: ReactNode
  as?: ElementType
  className?: string
  threshold?: number
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [threshold])

  return (
    <Tag ref={ref} className={`mf-stagger ${inView ? "is-in" : ""} ${className}`}>
      {children}
    </Tag>
  )
}

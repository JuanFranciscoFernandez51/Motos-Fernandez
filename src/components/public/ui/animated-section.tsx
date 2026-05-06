"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

type Animation = "fade-up" | "fade" | "slide-left" | "slide-right" | "scale"

/**
 * Wrapper que aplica una animación al elemento cuando entra en viewport.
 * Usa IntersectionObserver — sin librerías externas.
 */
export function AnimatedSection({
  children,
  animation = "fade-up",
  delay = 0,
  threshold = 0.1,
  className = "",
}: {
  children: ReactNode
  animation?: Animation
  delay?: number
  threshold?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  const animClass = visible
    ? animation === "fade-up"
      ? "animate-fade-in-up"
      : animation === "fade"
        ? "animate-fade-in"
        : animation === "slide-left"
          ? "animate-slide-in-left"
          : animation === "slide-right"
            ? "animate-slide-in-right"
            : "animate-scale-in"
    : "opacity-0"

  return (
    <div
      ref={ref}
      className={`${animClass} ${className}`}
      style={{ animationDelay: visible && delay > 0 ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  )
}

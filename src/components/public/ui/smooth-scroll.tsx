"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Lenis from "lenis"

/**
 * Scroll suave global (Lenis) — da la sensación "pro" de inercia fina al
 * scrollear, como en Cauce. Montado una sola vez en el layout público.
 *
 * - Respeta `prefers-reduced-motion`: si el usuario lo pide, NO activa el
 *   smooth scroll (queda el nativo, accesible).
 * - En mobile deja el scroll táctil nativo (smoothTouch off) para no pelear
 *   con el gesto del dedo.
 * - Al cambiar de ruta, vuelve arriba al toque (sin animar) para que no quede
 *   “cayendo” en la página nueva.
 */
export function SmoothScroll() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (prefersReduced) return

    const lenis = new Lenis({
      duration: 1.05,
      // ease-out exponencial: arranca rápido y frena suave
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      lerp: 0.1,
    })

    // Exponer para que otros (ej. anclas internas) puedan usarlo si hace falta.
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      ;(window as unknown as { __lenis?: Lenis }).__lenis = undefined
    }
  }, [])

  // Al navegar, resetear scroll arriba sin inercia.
  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [pathname])

  return null
}

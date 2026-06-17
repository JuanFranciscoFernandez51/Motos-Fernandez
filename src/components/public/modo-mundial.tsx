"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

/**
 * Modo Mundial 🇦🇷 — se activa desde el admin (switch + fechas opcionales).
 * Estilo "intermedio": banner arriba + confeti al cargar + un detalle
 * celeste-blanco (franja superior). Sin librerías externas (confeti en CSS).
 *
 * El estado lo trae /api/site/mundial. Si no está activo, no renderiza nada.
 */

const CELESTE = "#75AADB"
const SOL = "#F6B40E"
const COLORES = [CELESTE, "#FFFFFF", CELESTE, SOL, "#FFFFFF"]

export function ModoMundial() {
  const [active, setActive] = useState(false)
  const [confeti, setConfeti] = useState(false)
  const [bannerCerrado, setBannerCerrado] = useState(true)

  useEffect(() => {
    let vivo = true
    fetch("/api/site/mundial")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo || !d?.active) return
        setActive(true)
        setBannerCerrado(
          typeof window !== "undefined" &&
            sessionStorage.getItem("mundial-banner-cerrado") === "1"
        )
        // Confeti una sola vez al entrar.
        setConfeti(true)
        setTimeout(() => vivo && setConfeti(false), 5200)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (!active) return null

  const cerrarBanner = () => {
    setBannerCerrado(true)
    try {
      sessionStorage.setItem("mundial-banner-cerrado", "1")
    } catch {}
  }

  // Piezas de confeti con posición/retraso/color pseudo-aleatorios pero estables.
  const piezas = Array.from({ length: 70 }, (_, i) => {
    const left = (i * 37) % 100
    const delay = (i % 12) * 0.18
    const dur = 3.4 + ((i * 13) % 22) / 10
    const color = COLORES[i % COLORES.length]
    const size = 6 + (i % 4) * 2
    const rot = (i * 53) % 360
    return { left, delay, dur, color, size, rot, i }
  })

  return (
    <>
      {/* Franja superior celeste-blanco-celeste (detalle de marca Mundial) */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 h-[3px] z-[70] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${CELESTE}, #ffffff, ${CELESTE})`,
        }}
      />

      {/* Banner arriba (en flujo, empuja el contenido) */}
      {!bannerCerrado && (
        <div
          className="relative w-full text-center text-[#0B2A4A] font-bold text-xs sm:text-sm py-2 px-8"
          style={{
            background: `linear-gradient(90deg, ${CELESTE} 0%, #eaf4fb 50%, ${CELESTE} 100%)`,
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>⭐</span> ¡VAMOS ARGENTINA! 🇦🇷 — Viví el Mundial con
            Motos Fernández <span aria-hidden>⚽</span>
          </span>
          <button
            type="button"
            onClick={cerrarBanner}
            aria-label="Cerrar"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0B2A4A]/70 hover:text-[#0B2A4A]"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Confeti (overlay fijo, no interactivo, una sola vez) */}
      {confeti && (
        <div
          aria-hidden
          className="fixed inset-0 z-[65] pointer-events-none overflow-hidden"
        >
          {piezas.map((p) => (
            <span
              key={p.i}
              className="mundial-confeti"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.6}px`,
                background: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
                transform: `rotate(${p.rot}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes mundialCaida {
          0%   { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0.9; }
        }
        .mundial-confeti {
          position: absolute;
          top: -12vh;
          border-radius: 2px;
          animation-name: mundialCaida;
          animation-timing-function: ease-in;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
          box-shadow: 0 0 1px rgba(0,0,0,0.15);
        }
        @media (prefers-reduced-motion: reduce) {
          .mundial-confeti { display: none; }
        }
      `}</style>
    </>
  )
}

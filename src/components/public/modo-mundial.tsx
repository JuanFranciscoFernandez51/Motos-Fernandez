"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

/**
 * Modo Mundial 🇦🇷 — se activa desde el admin (switch + fechas opcionales).
 *
 * - Barra festiva FIJA abajo (queda visible siempre, arriba de la barra
 *   inferior mobile).
 * - Decoraciones argentinas (banderas / estrellas / pelotas / sol) flotando
 *   siempre de fondo → movimiento constante.
 * - Confeti al cargar Y cuando el usuario scrollea (se reactiva al moverte
 *   por la página, con throttle para no saturar).
 * - Franja superior celeste-blanco.
 *
 * Sin librerías externas (todo CSS). Respeta prefers-reduced-motion.
 */

const CELESTE = "#75AADB"
const SOL = "#F6B40E"
const COLORES = [CELESTE, "#FFFFFF", CELESTE, SOL, "#FFFFFF"]
const EMOJIS = ["🇦🇷", "⭐", "⚽", "☀️", "🇦🇷", "⭐"]

type Burst = { id: number; n: number }

function Confeti({ n }: { n: number }) {
  const piezas = Array.from({ length: n }, (_, i) => {
    const left = (i * 41 + 7) % 100
    const delay = (i % 10) * 0.12
    const dur = 3.2 + ((i * 17) % 26) / 10
    const esEmoji = i % 3 === 0
    const color = COLORES[i % COLORES.length]
    const emoji = EMOJIS[i % EMOJIS.length]
    const size = 7 + (i % 4) * 2
    const rot = (i * 47) % 360
    return { left, delay, dur, esEmoji, color, emoji, size, rot, i }
  })
  return (
    <div aria-hidden className="fixed inset-0 z-[65] pointer-events-none overflow-hidden">
      {piezas.map((p) =>
        p.esEmoji ? (
          <span
            key={p.i}
            className="mundial-confeti"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size + 8}px`,
              lineHeight: 1,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          >
            {p.emoji}
          </span>
        ) : (
          <span
            key={p.i}
            className="mundial-confeti"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.6}px`,
              background: p.color,
              borderRadius: "2px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        )
      )}
    </div>
  )
}

export function ModoMundial() {
  const [active, setActive] = useState(false)
  const [bannerCerrado, setBannerCerrado] = useState(true)
  const [bursts, setBursts] = useState<Burst[]>([])
  const burstId = useRef(0)
  const lastScrollBurst = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  const lanzarConfeti = (n: number) => {
    const id = ++burstId.current
    setBursts((b) => [...b, { id, n }])
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 5600)
  }

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
        lanzarConfeti(54) // burst de bienvenida

        // Confeti reactivo al scroll (throttle 1.6s)
        const onScroll = () => {
          const ahora = Date.now()
          if (ahora - lastScrollBurst.current > 1600) {
            lastScrollBurst.current = ahora
            lanzarConfeti(16)
          }
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        // limpieza
        cleanupRef.current = () => window.removeEventListener("scroll", onScroll)
      })
      .catch(() => {})
    return () => {
      vivo = false
      cleanupRef.current?.()
    }
  }, [])

  if (!active) return null

  const cerrarBanner = () => {
    setBannerCerrado(true)
    try {
      sessionStorage.setItem("mundial-banner-cerrado", "1")
    } catch {}
  }

  // Decoraciones flotando de fondo (siempre).
  const flotantes = Array.from({ length: 14 }, (_, i) => ({
    left: (i * 53 + 4) % 100,
    delay: (i % 14) * 1.1,
    dur: 13 + ((i * 7) % 12),
    emoji: EMOJIS[i % EMOJIS.length],
    size: 16 + (i % 3) * 6,
    i,
  }))

  return (
    <>
      {/* Banner festivo ARRIBA (en flujo, dentro del header sticky → queda
          fijo arriba al scrollear). */}
      {!bannerCerrado && (
        <div
          className="relative w-full text-center text-[#0B2A4A] font-bold text-xs sm:text-sm py-2 px-9"
          style={{ background: `linear-gradient(90deg, ${CELESTE} 0%, #eaf4fb 50%, ${CELESTE} 100%)` }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>⭐⭐⭐</span> ¡VAMOS ARGENTINA! 🇦🇷 — Viví el Mundial
            con Motos Fernández <span aria-hidden>⚽</span>
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

      {/* Decoraciones flotando de fondo */}
      <div aria-hidden className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
        {flotantes.map((f) => (
          <span
            key={f.i}
            className="mundial-flota"
            style={{
              left: `${f.left}%`,
              fontSize: `${f.size}px`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.dur}s`,
            }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Confeti (bursts: carga + scroll) */}
      {bursts.map((b) => (
        <Confeti key={b.id} n={b.n} />
      ))}

      <style>{`
        /* Hover mundialero en las cards de motos: celeste/blanco + precio amarillo */
        .moto-card { transition: background-color .35s ease, background .35s ease; }
        .moto-card:hover {
          background: linear-gradient(135deg, ${CELESTE} 0%, #eaf4fb 55%, #ffffff 100%) !important;
        }
        .moto-card:hover .moto-precio { color: ${SOL} !important; }
        @keyframes mundialCaida {
          0%   { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(112vh) rotate(560deg); opacity: 0.85; }
        }
        @keyframes mundialFlota {
          0%   { transform: translateY(14vh) translateX(0) rotate(0deg); opacity: 0; }
          12%  { opacity: 0.28; }
          88%  { opacity: 0.28; }
          100% { transform: translateY(-115vh) translateX(36px) rotate(40deg); opacity: 0; }
        }
        .mundial-confeti {
          position: absolute; top: -12vh;
          animation-name: mundialCaida; animation-timing-function: ease-in;
          animation-iteration-count: 1; animation-fill-mode: forwards;
        }
        .mundial-flota {
          position: absolute; bottom: -14vh;
          animation-name: mundialFlota; animation-timing-function: linear;
          animation-iteration-count: infinite; will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .mundial-confeti, .mundial-flota { display: none; }
        }
      `}</style>
    </>
  )
}

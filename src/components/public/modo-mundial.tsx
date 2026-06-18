"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

/**
 * Modo Mundial 🇦🇷 — kit festivo (basado en el handoff de diseño).
 *
 * Piezas (configurables desde admin → Marketing → Modo Mundial):
 *  - Barra de anuncio arriba: estilo "bandera" (franja celeste/blanca + Sol de
 *    Mayo girando + shimmer) o "marquee" (cinta oscura desplazándose).
 *  - Confetti celeste/blanco/dorado en <canvas> (niveles: sutil/medio/trapo).
 *  - Hover mundialero en las cards de motos (celeste/blanco + precio amarillo).
 *
 * Estado desde /api/site/mundial. Respeta prefers-reduced-motion.
 */

const CELESTE = "#75AADB"
const ORO = "#F4B739"
const AZUL_TEXTO = "#0c3a63"
const CONFETTI_COLORS = ["#75AADB", "#ffffff", "#9FCBEF", "#F4B739", "#bcdcf5", "#ffffff"]
const NIVELES: Record<string, number> = { sutil: 30, medio: 58, trapo: 95 }

const FRASES_MARQUEE = [
  "Vamos Argentina",
  "Mundial 2026",
  "Motos Fernández te banca",
  "Tricampeones del mundo",
]

type MundialState = {
  active: boolean
  barraEstilo: "bandera" | "marquee"
  confetti: boolean
  confettiNivel: string
}

function SolDeMayo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden
      className="mf-sun shrink-0"
    >
      <circle cx="48" cy="48" r="40" fill="none" stroke={ORO} strokeWidth="15" strokeDasharray="3.6 8.2" />
      <circle cx="48" cy="48" r="24" fill={ORO} stroke="#cf8a18" strokeWidth="2" />
    </svg>
  )
}

function BarraBandera({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="relative w-full overflow-hidden flex items-center justify-center gap-3.5 px-9"
      style={{
        height: 48,
        background:
          "linear-gradient(180deg, #75AADB 0%, #75AADB 33%, #ffffff 33%, #ffffff 67%, #75AADB 67%, #75AADB 100%)",
      }}
    >
      <SolDeMayo size={24} />
      <span
        className="font-extrabold uppercase"
        style={{ color: AZUL_TEXTO, letterSpacing: "0.12em", fontSize: 15 }}
      >
        ¡Vamos Argentina!
      </span>
      <span
        className="font-bold uppercase hidden sm:inline"
        style={{ color: AZUL_TEXTO, opacity: 0.7, letterSpacing: "0.18em", fontSize: 12 }}
      >
        Mundial 2026
      </span>
      <span aria-hidden className="mf-shimmer" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-2 top-1/2 -translate-y-1/2"
        style={{ color: AZUL_TEXTO }}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function BarraMarquee({ onClose }: { onClose: () => void }) {
  const bloque = (
    <span className="mf-mq-bloque inline-flex items-center">
      {FRASES_MARQUEE.map((f, i) => (
        <span key={i} className="inline-flex items-center">
          <span
            className="font-bold uppercase"
            style={{ color: "#cfe0f0", letterSpacing: "0.16em", fontSize: 13, padding: "0 22px" }}
          >
            {f}
          </span>
          <span aria-hidden style={{ color: i % 2 === 0 ? ORO : CELESTE, fontSize: 11 }}>
            ◆
          </span>
        </span>
      ))}
    </span>
  )
  return (
    <div
      className="relative w-full overflow-hidden flex items-center px-9"
      style={{
        height: 48,
        background: "#0c0e12",
        borderTop: "1px solid rgba(117,170,219,.35)",
        borderBottom: "1px solid rgba(117,170,219,.35)",
      }}
    >
      <div className="mf-mq-track flex whitespace-nowrap">
        {bloque}
        {bloque}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#cfe0f0]/70 hover:text-[#cfe0f0] bg-[#0c0e12]"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function Confetti({ nivel }: { nivel: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const base = NIVELES[nivel] ?? NIVELES.sutil
    let W = 0, H = 0, dpr = 1, parts: ReturnType<typeof spawn>[] = []
    let raf = 0, t = 0

    function spawn(init: boolean) {
      return {
        x: Math.random() * W,
        y: init ? Math.random() * H : -12 - Math.random() * 60,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 8,
        c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        vy: 0.45 + Math.random() * 0.85,
        sway: 0.5 + Math.random() * 1.2,
        ph: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI,
        vr: -0.04 + Math.random() * 0.08,
      }
    }
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.max(1, window.innerWidth)
      H = Math.max(1, window.innerHeight)
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const make = () => {
      const count = Math.round(base * Math.max(0.5, W / 720))
      parts = Array.from({ length: count }, () => spawn(true))
    }
    resize()
    make()
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.y += p.vy
        p.x += Math.sin(t * p.sway + p.ph) * 0.6
        p.rot += p.vr
        if (p.y > H + 24) Object.assign(p, spawn(false))
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = 0.92
        ctx.fillStyle = p.c
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    frame()
    const onResize = () => {
      resize()
      make()
    }
    window.addEventListener("resize", onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [nivel])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 z-[3] pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  )
}

export function ModoMundial() {
  const [st, setSt] = useState<MundialState | null>(null)
  const [barraCerrada, setBarraCerrada] = useState(true)

  useEffect(() => {
    let vivo = true
    fetch("/api/site/mundial")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo || !d?.active) return
        setSt({
          active: true,
          barraEstilo: d.barraEstilo === "marquee" ? "marquee" : "bandera",
          confetti: d.confetti !== false,
          confettiNivel: d.confettiNivel || "sutil",
        })
        try {
          setBarraCerrada(localStorage.getItem("mf-mundial-bar-cerrada-v2") === "1")
        } catch {}
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (!st?.active) return null

  const cerrarBarra = () => {
    setBarraCerrada(true)
    try {
      localStorage.setItem("mf-mundial-bar-cerrada-v2", "1")
    } catch {}
  }

  return (
    <>
      {!barraCerrada &&
        (st.barraEstilo === "marquee" ? (
          <BarraMarquee onClose={cerrarBarra} />
        ) : (
          <BarraBandera onClose={cerrarBarra} />
        ))}

      {st.confetti && <Confetti nivel={st.confettiNivel} />}

      <style>{`
        @keyframes mfSpin { to { transform: rotate(360deg); } }
        @keyframes mfShimmer { 0% { transform: translateX(-130%) skewX(-18deg); } 100% { transform: translateX(130%) skewX(-18deg); } }
        @keyframes mfMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mf-sun { animation: mfSpin 32s linear infinite; transform-origin: 50% 50%; }
        .mf-shimmer {
          position: absolute; top: 0; bottom: 0; width: 40%; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
          animation: mfShimmer 5.5s ease-in-out infinite;
        }
        .mf-mq-track { animation: mfMarquee 22s linear infinite; }
        .mf-mq-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .mf-sun, .mf-shimmer, .mf-mq-track { animation: none !important; }
        }
      `}</style>
    </>
  )
}

"use client"

import { useEffect, useState } from "react"
import { CreditCard, Truck, Sparkles, Wrench, Package } from "lucide-react"

const MESSAGES = [
  { icon: Truck, text: "Envío propio a todo el país" },
  { icon: CreditCard, text: "Financiación propia hasta 24 cuotas" },
  { icon: Sparkles, text: "Más de 50 marcas en stock" },
  { icon: Wrench, text: "Taller oficial multimarca" },
  { icon: Package, text: "Entrega inmediata" },
] as const

// Promo Mundial — frases de la franja celeste (reemplaza la cinta normal)
const PROMO_FRASES = [
  "Envío gratis a todo el Sur",
  "Mundial 2026",
  "Sin mínimo de compra",
  "Llevamos tu moto a la Patagonia",
] as const

function MarqueeTrack() {
  return (
    <>
      {MESSAGES.map((m, i) => {
        const Icon = m.icon
        return (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-8 text-xs sm:text-[13px] font-semibold tracking-wide whitespace-nowrap"
          >
            <Icon className="size-3.5 shrink-0 text-[#C8C8D0]" aria-hidden />
            {m.text}
            <span className="size-1 rounded-full bg-[#C8C8D0]/50 ml-2" aria-hidden />
          </span>
        )
      })}
    </>
  )
}

function PromoTrack() {
  return (
    <>
      {PROMO_FRASES.map((f, i) => (
        <span
          key={i}
          className="inline-flex items-center whitespace-nowrap font-extrabold uppercase"
          style={{ color: "#0c3a63", letterSpacing: "0.14em", fontSize: 13, padding: "0 20px" }}
        >
          {f}
          <span aria-hidden style={{ color: "#0c3a63", opacity: 0.5, marginLeft: 20 }}>
            ◆
          </span>
        </span>
      ))}
    </>
  )
}

/** Franja celeste de la promo Mundial (reemplaza la cinta normal). */
function PromoBarMundial() {
  return (
    <div className="relative overflow-hidden" style={{ background: "#75AADB" }}>
      <div className="flex h-9 sm:h-10 items-center">
        <div className="promo-mq flex shrink-0 whitespace-nowrap [will-change:transform]">
          <PromoTrack />
          <PromoTrack />
        </div>
      </div>
      <style>{`
        @keyframes promoMq { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .promo-mq { animation: promoMq 22s linear infinite; }
        .promo-mq:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .promo-mq { animation: none; } }
      `}</style>
    </div>
  )
}

export function PromoBar() {
  const [promo, setPromo] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch("/api/site/mundial")
      .then((r) => r.json())
      .then((d) => {
        if (vivo && d?.promoEnvio) setPromo(true)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  if (promo) return <PromoBarMundial />

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#0E0B12] via-[#1A1325] to-[#0E0B12] text-white border-b border-[#C8C8D0]/20">
      {/* Línea dorada arriba/abajo */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C8C8D0]/40 to-transparent"
      />
      <div className="flex h-9 items-center">
        <div className="flex shrink-0 animate-marquee whitespace-nowrap [will-change:transform]">
          <MarqueeTrack />
          <MarqueeTrack />
        </div>
      </div>
    </div>
  )
}

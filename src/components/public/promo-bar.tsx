import { CreditCard, Truck, Sparkles, Wrench, Package } from "lucide-react"

const MESSAGES = [
  { icon: Truck, text: "Envío propio a todo el país" },
  { icon: CreditCard, text: "Financiación propia hasta 24 cuotas" },
  { icon: Sparkles, text: "Más de 50 marcas en stock" },
  { icon: Wrench, text: "Taller oficial multimarca" },
  { icon: Package, text: "Entrega inmediata" },
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

export function PromoBar() {
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

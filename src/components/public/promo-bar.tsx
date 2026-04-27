import { CreditCard, Truck, Sparkles, ShieldCheck, Wrench, Package } from "lucide-react"

const MESSAGES = [
  { icon: Truck, text: "Envío propio a todo el país" },
  { icon: CreditCard, text: "Financiación propia hasta 24 cuotas" },
  { icon: Sparkles, text: "Más de 50 marcas en stock" },
  { icon: ShieldCheck, text: "Empresa familiar desde 1985" },
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
            className="inline-flex items-center gap-2 px-8 text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap"
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {m.text}
          </span>
        )
      })}
    </>
  )
}

export function PromoBar() {
  return (
    <div className="overflow-hidden bg-gradient-to-r from-[#6B4F7A] via-[#8B6F9A] to-[#9B59B6] text-white">
      <div className="flex h-9 items-center">
        <div className="flex shrink-0 animate-marquee whitespace-nowrap [will-change:transform]">
          <MarqueeTrack />
          <MarqueeTrack />
        </div>
      </div>
    </div>
  )
}

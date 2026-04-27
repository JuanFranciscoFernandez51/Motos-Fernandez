"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, Truck, Sparkles, X } from "lucide-react"

const STORAGE_KEY = "mf_promo_bar_dismissed_v1"

const MESSAGES = [
  {
    icon: CreditCard,
    text: "Financiación propia hasta 24 cuotas",
    cta: { label: "Ver planes", href: "/financiacion" },
  },
  {
    icon: Truck,
    text: "Envío propio a todo el país",
    cta: { label: "Ver tienda", href: "/tienda" },
  },
  {
    icon: Sparkles,
    text: "Más de 50 marcas en stock",
    cta: { label: "Ver catálogo", href: "/catalogo" },
  },
] as const

export function PromoBar() {
  const [dismissed, setDismissed] = useState(true)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1")
  }, [])

  useEffect(() => {
    if (dismissed) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % MESSAGES.length)
    }, 5000)
    return () => clearInterval(id)
  }, [dismissed])

  if (dismissed) return null

  const current = MESSAGES[index]
  const Icon = current.icon

  return (
    <div className="relative bg-gradient-to-r from-[#6B4F7A] via-[#8B6F9A] to-[#9B59B6] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-9 items-center justify-center gap-3 text-xs sm:text-sm">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="font-medium tracking-wide">{current.text}</span>
          <Link
            href={current.cta.href}
            className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider hover:bg-white/25 transition-colors"
          >
            {current.cta.label}
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1")
          setDismissed(true)
        }}
        aria-label="Cerrar"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

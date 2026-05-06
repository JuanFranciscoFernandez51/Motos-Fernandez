"use client"

import Image from "next/image"

/**
 * Banner de marcas con scroll continuo (marquee).
 * Usa logos SVG reales en monocromo, sobre fondo negro.
 */

type Brand = {
  nombre: string
  logo: string
  // ratio aproximado para que ocupen ancho similar (height fijo)
  width: number
}

type BrandWithHeight = Brand & { heightMul?: number }

const DEFAULT_BRANDS: BrandWithHeight[] = [
  { nombre: "Honda", logo: "/images/marcas/honda.svg", width: 110 },
  { nombre: "Yamaha", logo: "/images/marcas/yamaha.svg", width: 110 },
  { nombre: "Suzuki", logo: "/images/marcas/suzuki.svg", width: 100 },
  { nombre: "Kawasaki", logo: "/images/marcas/kawasaki.svg", width: 140 },
  { nombre: "BMW", logo: "/images/marcas/bmw.svg", width: 50, heightMul: 1.2 },
  { nombre: "KTM", logo: "/images/marcas/ktm.svg", width: 80 },
  { nombre: "Ducati", logo: "/images/marcas/ducati.svg", width: 110 },
  { nombre: "Vespa", logo: "/images/marcas/vespa.svg", width: 130, heightMul: 1.4 },
  { nombre: "Piaggio", logo: "/images/marcas/piaggio.svg", width: 90, heightMul: 1.3 },
  { nombre: "Aprilia", logo: "/images/marcas/aprilia.svg", width: 120 },
  { nombre: "Triumph", logo: "/images/marcas/triumph.svg", width: 120 },
  { nombre: "Royal Enfield", logo: "/images/marcas/royal-enfield.svg", width: 80 },
  { nombre: "Bajaj", logo: "/images/marcas/bajaj.svg", width: 100 },
]

export function MarqueeBrands({
  brands,
  speed = "normal",
}: {
  brands?: Brand[]
  speed?: "slow" | "normal" | "fast"
}) {
  const list = brands && brands.length > 0 ? brands : DEFAULT_BRANDS
  // Duplicamos para loop infinito
  const items = [...list, ...list]

  const speedClass =
    speed === "slow"
      ? "[animation-duration:60s]"
      : speed === "fast"
        ? "[animation-duration:25s]"
        : "[animation-duration:45s]"

  return (
    <div
      className="relative overflow-hidden bg-black border-y border-white/[0.06]"
      aria-hidden
    >
      {/* Fade en los bordes para suavizar la entrada/salida */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-black to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-black to-transparent"
        aria-hidden
      />

      <div
        className={`flex animate-marquee whitespace-nowrap ${speedClass} py-4 sm:py-6 hover:[animation-play-state:paused]`}
      >
        {items.map((brand, i) => {
          const b = brand as BrandWithHeight
          const mul = b.heightMul ?? 1
          return (
            <div
              key={i}
              className="inline-flex items-center justify-center px-8 sm:px-10 shrink-0"
              style={{ minHeight: "32px" }}
            >
              <Image
                src={brand.logo}
                alt={brand.nombre}
                width={brand.width}
                height={32}
                className="w-auto opacity-75 hover:opacity-100 transition-opacity"
                style={{
                  maxWidth: `${brand.width}px`,
                  height: `${28 * mul}px`,
                  filter: "brightness(0) invert(1)",
                }}
                unoptimized
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

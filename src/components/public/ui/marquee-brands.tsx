"use client"

/**
 * Banner de marcas con scroll continuo (marquee).
 * Premium feel — letras grandes, movimiento suave, fade en bordes.
 */
export function MarqueeBrands({
  brands,
  speed = "normal",
  variant = "light",
}: {
  brands?: string[]
  speed?: "slow" | "normal" | "fast"
  variant?: "light" | "dark" | "violeta"
}) {
  const defaultBrands = [
    "Honda",
    "Yamaha",
    "Suzuki",
    "Kawasaki",
    "BMW",
    "KTM",
    "Ducati",
    "Vespa",
    "Piaggio",
    "Aprilia",
    "Triumph",
    "Royal Enfield",
    "Benelli",
    "Bajaj",
    "Zanella",
    "Motomel",
    "Corven",
    "Gilera",
  ]

  const list = brands && brands.length > 0 ? brands : defaultBrands

  // Duplicamos para loop infinito
  const items = [...list, ...list]

  const speedClass =
    speed === "slow"
      ? "[animation-duration:60s]"
      : speed === "fast"
        ? "[animation-duration:25s]"
        : "[animation-duration:40s]"

  const colorClasses =
    variant === "dark"
      ? "bg-[#0E0B12] text-white/80 border-white/5"
      : variant === "violeta"
        ? "bg-gradient-to-r from-[#4A3556] via-[#6B4F7A] to-[#4A3556] text-white"
        : "bg-[#F8F5FA] text-[#1A1A1A] border-[#6B4F7A]/10"

  return (
    <div
      className={`relative overflow-hidden border-y ${colorClasses}`}
      aria-hidden
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-current to-transparent opacity-0" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-current to-transparent opacity-0" />

      <div
        className={`flex animate-marquee whitespace-nowrap ${speedClass} py-6 sm:py-8 hover:[animation-play-state:paused]`}
      >
        {items.map((brand, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-8 px-8 font-serif text-2xl sm:text-3xl lg:text-4xl tracking-wide ${
              variant === "violeta"
                ? "text-white/85"
                : variant === "dark"
                  ? "text-white/70"
                  : "text-[#1A1A1A]/60"
            }`}
          >
            {brand}
            <span
              className={`size-1.5 rounded-full ${
                variant === "violeta"
                  ? "bg-[#C9A55C]"
                  : variant === "dark"
                    ? "bg-[#C9A55C]"
                    : "bg-[#6B4F7A]"
              }`}
              aria-hidden
            />
          </span>
        ))}
      </div>
    </div>
  )
}

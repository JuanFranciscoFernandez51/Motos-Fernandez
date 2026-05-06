import { Watermark } from "./watermark"
import { GoldDivider } from "./gold-divider"
import { SectionEyebrow } from "./section-eyebrow"

/**
 * Hero compacto para páginas internas con el mismo lenguaje premium.
 */
export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  variant = "default",
  size = "md",
}: {
  eyebrow?: string
  title: string
  highlight?: string
  description?: string
  variant?: "default" | "compact"
  size?: "sm" | "md" | "lg"
}) {
  const py =
    size === "sm"
      ? "py-12 sm:py-14"
      : size === "lg"
        ? "py-16 sm:py-24"
        : "py-14 sm:py-18 lg:py-20"

  const titleSize =
    size === "sm"
      ? "text-3xl sm:text-4xl lg:text-5xl"
      : size === "lg"
        ? "text-5xl sm:text-6xl lg:text-7xl"
        : "text-4xl sm:text-5xl lg:text-6xl"

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325] ${py}`}
    >
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
      <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
      <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C9A55C]/[0.06] blur-3xl pointer-events-none" />
      {variant !== "compact" && (
        <Watermark position="right" size="lg" opacity="subtle" className="hidden md:block" />
      )}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {eyebrow && (
          <SectionEyebrow centered variant="gold">
            {eyebrow}
          </SectionEyebrow>
        )}
        <h1
          className={`${eyebrow ? "mt-5" : ""} font-serif text-white text-balance leading-tight ${titleSize}`}
        >
          {title}
          {highlight && (
            <>
              {" "}
              <em className="text-[#C9A55C]">{highlight}</em>
            </>
          )}
        </h1>
        <GoldDivider variant="ornament" className="mt-6" />
        {description && (
          <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  )
}

import { Watermark } from "./watermark"
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
      ? "py-8 sm:py-10"
      : size === "lg"
        ? "py-12 sm:py-16"
        : "py-9 sm:py-12"

  const titleSize =
    size === "sm"
      ? "text-2xl sm:text-3xl lg:text-4xl"
      : size === "lg"
        ? "text-4xl sm:text-5xl lg:text-6xl"
        : "text-3xl sm:text-4xl lg:text-5xl"

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325] ${py}`}
    >
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
      <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
      <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#7C3AED]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C8C8D0]/[0.06] blur-3xl pointer-events-none" />
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
          className={`${eyebrow ? "mt-3" : ""} font-heading text-white text-balance leading-tight ${titleSize}`}
        >
          {title}
          {highlight && (
            <>
              {" "}
              <span className="text-[#C8C8D0]">{highlight}</span>
            </>
          )}
        </h1>
        {description && (
          <p className="mt-3 text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  )
}

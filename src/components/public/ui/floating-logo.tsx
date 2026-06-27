import Image from "next/image"

/**
 * Logo flotante con animación suave (sube/baja + respira) para usar como
 * decoración premium en el hero. Usa el wordmark horizontal "MOTOS FERNANDEZ"
 * con efecto cromado/plateado y borde negro.
 */
export function FloatingLogo({
  size = "lg",
  opacity = "soft",
  className = "",
  position = "right",
}: {
  size?: "md" | "lg" | "xl" | "2xl"
  opacity?: "subtle" | "soft" | "medium" | "strong"
  className?: string
  position?: "right" | "left" | "center"
}) {
  // Wordmark horizontal (~ratio 1.4:1) — width-based para mantener proporcion
  const widthClass =
    size === "md"
      ? "w-72 lg:w-96"
      : size === "lg"
        ? "w-96 lg:w-[520px]"
        : size === "xl"
          ? "w-[480px] lg:w-[640px]"
          : "w-[560px] lg:w-[760px]"

  const opacityClass =
    opacity === "subtle"
      ? "opacity-[0.18]"
      : opacity === "soft"
        ? "opacity-[0.32]"
        : opacity === "medium"
          ? "opacity-[0.55]"
          : "opacity-[0.85]"

  const positionClass =
    position === "left"
      ? "-left-16 sm:-left-12"
      : position === "right"
        ? "-right-16 sm:-right-12"
        : "left-1/2 -translate-x-1/2"

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${positionClass} ${className}`}
    >
      {/* Glow violeta detrás para profundidad */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl bg-[#7C3AED]/30 scale-75 animate-pulse"
        style={{ animationDuration: "6s" }}
      />

      {/* Logo con animación de flotación suave */}
      <div
        className={`relative ${opacityClass} animate-float-logo`}
        style={{ filter: "drop-shadow(0 10px 28px rgba(0, 0, 0, 0.45))" }}
      >
        <Image
          src="/images/motos-fernandez-wordmark.png"
          alt=""
          width={1024}
          height={724}
          className={`${widthClass} h-auto object-contain select-none`}
          priority={false}
        />
      </div>
    </div>
  )
}

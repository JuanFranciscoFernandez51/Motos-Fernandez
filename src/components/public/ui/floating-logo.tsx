import Image from "next/image"

/**
 * Logo flotante con animación suave (sube/baja + respira) para usar como
 * decoración premium en el hero. Reemplaza al monograma estático.
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
  const sizeClass =
    size === "md"
      ? "size-64 lg:size-80"
      : size === "lg"
        ? "size-80 lg:size-[420px]"
        : size === "xl"
          ? "size-96 lg:size-[520px]"
          : "size-[420px] lg:size-[640px]"

  const opacityClass =
    opacity === "subtle"
      ? "opacity-[0.06]"
      : opacity === "soft"
        ? "opacity-[0.10]"
        : opacity === "medium"
          ? "opacity-[0.16]"
          : "opacity-[0.22]"

  const positionClass =
    position === "left"
      ? "-left-12 sm:-left-8"
      : position === "right"
        ? "-right-12 sm:-right-8"
        : "left-1/2 -translate-x-1/2"

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${positionClass} ${className}`}
    >
      {/* Glow violeta detrás para profundidad */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl bg-[#6B4F7A]/20 scale-75 animate-pulse"
        style={{ animationDuration: "6s" }}
      />

      {/* Logo con animación de flotación suave */}
      <div
        className={`relative ${opacityClass} animate-float-logo`}
        style={{ filter: "drop-shadow(0 8px 24px rgba(107, 79, 122, 0.25))" }}
      >
        <Image
          src="/images/monograma-blanco-transparente.svg"
          alt=""
          width={640}
          height={640}
          className={`${sizeClass} object-contain select-none`}
          priority={false}
        />
      </div>
    </div>
  )
}

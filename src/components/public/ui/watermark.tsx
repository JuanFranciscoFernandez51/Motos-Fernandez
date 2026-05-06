import Image from "next/image"

/**
 * Marca de agua del monograma — para usar como decoración premium en secciones.
 * Posicionable, opacidad/tamaño configurables.
 */
export function Watermark({
  position = "right",
  size = "lg",
  opacity = "subtle",
  className = "",
}: {
  position?: "left" | "right" | "center" | "top-right" | "bottom-left" | "bottom-right"
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
  opacity?: "subtle" | "soft" | "medium"
  className?: string
}) {
  const sizeClass =
    size === "sm"
      ? "size-32"
      : size === "md"
        ? "size-48"
        : size === "lg"
          ? "size-72 lg:size-96"
          : size === "xl"
            ? "size-96 lg:size-[480px]"
            : "size-[420px] lg:size-[640px]"

  const opacityClass =
    opacity === "subtle"
      ? "opacity-[0.04]"
      : opacity === "soft"
        ? "opacity-[0.07]"
        : "opacity-[0.12]"

  const positionClass =
    position === "left"
      ? "-left-12 sm:-left-8 top-1/2 -translate-y-1/2"
      : position === "right"
        ? "-right-12 sm:-right-8 top-1/2 -translate-y-1/2"
        : position === "center"
          ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          : position === "top-right"
            ? "-top-16 -right-16"
            : position === "bottom-left"
              ? "-bottom-16 -left-16"
              : "-bottom-16 -right-16"

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${positionClass} ${opacityClass} ${className}`}
    >
      <Image
        src="/images/monograma-blanco-transparente.svg"
        alt=""
        width={640}
        height={640}
        className={sizeClass}
      />
    </div>
  )
}

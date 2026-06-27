/**
 * Eyebrow ornamental para encabezar secciones premium.
 * Pequeño detalle dorado + texto en mayúsculas con tracking ancho.
 */
export function SectionEyebrow({
  children,
  centered = false,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode
  centered?: boolean
  variant?: "default" | "gold" | "white"
  className?: string
}) {
  const colorClass =
    variant === "gold"
      ? "text-[#C8C8D0]"
      : variant === "white"
        ? "text-white/70"
        : "text-[#9D5CF0]"

  const dotClass =
    variant === "gold"
      ? "bg-[#C8C8D0]"
      : variant === "white"
        ? "bg-white/60"
        : "bg-[#9D5CF0]"

  return (
    <div
      className={`flex items-center gap-3 ${centered ? "justify-center" : ""} ${className}`}
    >
      <span className={`h-px w-8 sm:w-10 ${dotClass}/50`} />
      <p
        className={`font-semibold text-[10px] sm:text-xs uppercase tracking-[0.22em] ${colorClass}`}
      >
        {children}
      </p>
      <span className={`h-px w-8 sm:w-10 ${dotClass}/50`} />
    </div>
  )
}

/**
 * Divisor premium con detalles dorados — usado para separar secciones con elegancia.
 */
export function GoldDivider({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "ornament" | "thin" | "thick"
  className?: string
}) {
  if (variant === "ornament") {
    return (
      <div className={`flex items-center justify-center gap-3 ${className}`}>
        <span className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent via-[#C8C8D0] to-[#C8C8D0]" />
        <span className="size-2 rotate-45 bg-[#C8C8D0]" />
        <span className="size-1 rounded-full bg-[#C8C8D0]" />
        <span className="size-2 rotate-45 bg-[#C8C8D0]" />
        <span className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent via-[#C8C8D0] to-[#C8C8D0]" />
      </div>
    )
  }
  if (variant === "thin") {
    return (
      <div
        className={`h-px w-full bg-gradient-to-r from-transparent via-[#C8C8D0]/50 to-transparent ${className}`}
        aria-hidden
      />
    )
  }
  if (variant === "thick") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-[#C8C8D0] to-[#C8C8D0]" />
        <span className="size-1.5 rounded-full bg-[#C8C8D0]" />
        <span className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-[#C8C8D0] to-[#C8C8D0]" />
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#C8C8D0]" />
      <span className="size-1 rounded-full bg-[#C8C8D0]" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#C8C8D0]" />
    </div>
  )
}

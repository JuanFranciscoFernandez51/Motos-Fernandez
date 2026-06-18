/**
 * Efecto "camiseta" Mundial 🇦🇷 — overlay on-hover para las cards de motos.
 *
 * En reposo la card queda limpia; al hacer hover (group-hover) aparecen:
 *  - Rayas verticales celestes sobre la foto (CamisetaStripes)
 *  - Badge "VAMOS" con Sol de Mayo girando (CamisetaBadge)
 *  - 3 estrellas doradas junto al nombre (CamisetaStars)
 *
 * El borde celeste + levante + cambio de CTA se aplican con clases group-hover
 * en la card que las usa. Se activa solo con el Modo Mundial.
 *
 * Adaptado a tema claro/oscuro vía clases `dark:`. Las cards usan `.group`.
 */

const STAR_PATH =
  "M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z"

/** Keyframe del Sol de Mayo — renderizar una vez por grilla. */
export function CamisetaStyles() {
  return (
    <style>{`
      @keyframes mfCamiSpin { to { transform: rotate(360deg); } }
      .mf-cami-sol { animation: mfCamiSpin 30s linear infinite; transform-origin: 50% 50%; }
      @media (prefers-reduced-motion: reduce) { .mf-cami-sol { animation: none; } }
    `}</style>
  )
}

/** Rayas verticales celestes sobre la foto (aparecen en hover). */
export function CamisetaStripes() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-[2] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out pointer-events-none"
      style={{
        background:
          "repeating-linear-gradient(90deg, rgba(117,170,219,0) 0 18px, rgba(117,170,219,.28) 18px 36px)",
      }}
    />
  )
}

/** Badge "VAMOS" con Sol de Mayo (top de la foto, aparece en hover). */
export function CamisetaBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute z-20 inline-flex items-center gap-1.5 rounded-full border border-[#75AADB] bg-white px-2.5 py-1 text-[#0c3a63] dark:bg-[#0c0e12] dark:text-[#9fc6e8] opacity-0 -translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 ease-out pointer-events-none shadow-sm ${className}`}
    >
      <svg viewBox="0 0 80 80" width={14} height={14} aria-hidden className="mf-cami-sol shrink-0">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#F4B739" strokeWidth="13" strokeDasharray="3.4 8" />
        <circle cx="40" cy="40" r="20" fill="#F4B739" />
      </svg>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">Vamos</span>
    </div>
  )
}

/** 3 estrellas doradas (aparecen en hover, junto al nombre). */
export function CamisetaStars({ size = 13 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center gap-0.5 shrink-0 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out delay-[80ms]"
    >
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path d={STAR_PATH} fill="#F4B739" />
        </svg>
      ))}
    </span>
  )
}

/**
 * Sello "GRATIS AL SUR" — promo Envío gratis Mundial.
 *
 * Estampa postal giratoria (anillo gira, centro fijo). Va en la esquina del
 * hero y sobre las cards de motos usadas <= 650cc en promo.
 *
 * `idSuffix` debe ser único por instancia en la página (el textPath usa un id).
 * Respeta prefers-reduced-motion (queda quieto).
 */

const TEXTO_CURVO = "· ENVÍO GRATIS · TODO EL SUR · MUNDIAL 2026 "

export function SelloEnvio({
  size = 150,
  idSuffix,
  className = "",
}: {
  size?: number
  idSuffix: string
  className?: string
}) {
  const pathId = `mfseal-${idSuffix}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden
      className={`mf-sello ${className}`}
    >
      <defs>
        <path id={pathId} d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
      </defs>

      {/* Anillo giratorio */}
      <g className="mf-sello-ring" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <circle cx="100" cy="100" r="95" className="mf-sello-disc" stroke="#75AADB" strokeWidth="2" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="#75AADB" strokeWidth="1" strokeDasharray="2 5" />
        <text className="mf-sello-curve" style={{ fontWeight: 700, fontSize: "13.5px", letterSpacing: "0.16em" }}>
          <textPath href={`#${pathId}`} startOffset="0">
            {TEXTO_CURVO}
          </textPath>
        </text>
      </g>

      {/* Centro fijo */}
      <g transform="translate(100,100)">
        <circle r="50" fill="#75AADB" />
        {/* Mini Sol de Mayo dorado */}
        <g transform="translate(0,-26)">
          <circle r="11" fill="none" stroke="#F4B739" strokeWidth="4.2" strokeDasharray="2 4.6" />
          <circle r="6" fill="#F4B739" />
        </g>
        <text x="0" y="6" textAnchor="middle" fill="#fff" style={{ fontWeight: 800, fontSize: "19px", letterSpacing: "0.02em" }}>
          GRATIS
        </text>
        <text x="0" y="26" textAnchor="middle" fill="#dbeafc" style={{ fontWeight: 600, fontSize: "10px", letterSpacing: "0.22em" }}>
          AL SUR
        </text>
      </g>

      <style>{`
        @keyframes mfSelloSpin { to { transform: rotate(360deg); } }
        .mf-sello-ring { animation: mfSelloSpin 24s linear infinite; }
        /* Tema claro (default): disco crema + texto oscuro */
        .mf-sello { filter: drop-shadow(0 8px 16px rgba(0,0,0,.28)); }
        .mf-sello-disc { fill: #F7F5EF; }
        .mf-sello-curve { fill: #0c0e12; }
        /* Tema oscuro: disco oscuro + texto claro */
        .dark .mf-sello { filter: drop-shadow(0 14px 26px rgba(0,0,0,.55)); }
        .dark .mf-sello-disc { fill: #0c0e12; }
        .dark .mf-sello-curve { fill: #e9edf2; }
        @media (prefers-reduced-motion: reduce) { .mf-sello-ring { animation: none; } }
      `}</style>
    </svg>
  )
}

/** Parsea cilindrada tipo "150cc", "650 cc", "1200" → número (o null). */
export function parseCilindrada(cc?: string | null): number | null {
  if (!cc) return null
  const m = cc.replace(/\./g, "").match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

// Categorías que NO son moto (la promo es solo para motos).
const CATEGORIAS_NO_MOTO = ["CUATRICICLO", "UTV", "MOTO_DE_AGUA"]

/**
 * ¿La moto califica para el sello? Promo = solo motos, usadas, <= 650cc.
 * Se excluyen explícitamente cuatris/UTV/motos de agua; cualquier otra cosa
 * (incl. categoría vacía) se considera moto para no dejar sin sello a las
 * motos que no tengan la categoría cargada.
 */
export function esElegiblePromoEnvio(moto: {
  condicion?: string | null
  cilindrada?: string | null
  categoriaVehiculo?: string | null
}): boolean {
  const esUsada = (moto.condicion || "").toUpperCase().includes("USAD")
  const esMoto = !CATEGORIAS_NO_MOTO.includes((moto.categoriaVehiculo || "").toUpperCase())
  const cc = parseCilindrada(moto.cilindrada)
  return esUsada && esMoto && cc !== null && cc <= 650
}

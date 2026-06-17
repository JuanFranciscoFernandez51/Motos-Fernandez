/**
 * Modo Mundial 🇦🇷 — piezas del hero de la home.
 *
 * Se monta dentro del hero y, si el Modo Mundial está activo (prop `active`,
 * calculada server-side en la page), agrega:
 *  - Bandera argentina flameando (SVG con filtro de desplazamiento animado).
 *  - 3 estrellas de campeón titilando escalonadas + "Tricampeones del mundo".
 *  - Franja celeste/blanca fina animada al pie.
 *
 * El badge "Edición Mundial 2026" vive en el eyebrow del hero. El confetti es
 * global (componente ModoMundial del layout). Respeta prefers-reduced-motion.
 */

const CELESTE = "#75AADB"
const ORO = "#F4B739"

const STAR_PATH =
  "M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z"

function BanderaFlameando({ width = 56 }: { width?: number }) {
  const h = (width * 210) / 320
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 320 210"
      aria-hidden
      className="mf-flag shrink-0"
      style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,.45))" }}
    >
      <defs>
        <filter id="mfwave" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.022"
            numOctaves="2"
            seed="4"
            result="n"
          >
            <animate
              attributeName="baseFrequency"
              dur="7s"
              values="0.012 0.022;0.016 0.017;0.012 0.022"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="13"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter="url(#mfwave)">
        <rect x="0" y="0" width="320" height="70" fill={CELESTE} />
        <rect x="0" y="70" width="320" height="70" fill="#ffffff" />
        <rect x="0" y="140" width="320" height="70" fill={CELESTE} />
        {/* Sol de Mayo */}
        <circle
          cx="160"
          cy="105"
          r="40"
          fill="none"
          stroke={ORO}
          strokeWidth="15"
          strokeDasharray="3.6 8.2"
        />
        <circle cx="160" cy="105" r="24" fill={ORO} stroke="#cf8a18" strokeWidth="2" />
      </g>
    </svg>
  )
}

function Estrellas({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      {[0, 0.35, 0.7].map((d, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className="mf-star"
          style={{
            animationDelay: `${d}s`,
            filter: "drop-shadow(0 4px 10px rgba(244,183,57,.4))",
          }}
        >
          <path d={STAR_PATH} fill={ORO} />
        </svg>
      ))}
    </span>
  )
}

export function MundialHero({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <div className="mt-8">
      {/* Bandera flameando + 3 estrellas de campeón + frase */}
      <div className="flex items-center gap-4">
        <div className="mf-float">
          <BanderaFlameando width={56} />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <Estrellas size={24} />
            <p className="text-base sm:text-lg font-bold text-white">
              Tricampeones del mundo
            </p>
          </div>
          <p className="mt-1 text-sm text-white/55">y vamos por más.</p>
        </div>
      </div>

      {/* Franja celeste/blanca animada al pie */}
      <div className="mf-stripe mt-6 h-[5px] w-full max-w-2xl rounded-full" aria-hidden />

      <style>{`
        @keyframes mfTwinkle { 0%,100% { opacity:.5; transform:scale(.88); } 50% { opacity:1; transform:scale(1.12); } }
        @keyframes mfStripe  { to { background-position: 200px 0; } }
        @keyframes mfFlutter { 0%,100% { transform: rotate(-1.1deg) translateY(0); } 50% { transform: rotate(1.3deg) translateY(-3px); } }
        @keyframes mfFloatHero { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .mf-star { animation: mfTwinkle 2.6s ease-in-out infinite; transform-origin: 50% 50%; }
        .mf-flag { animation: mfFlutter 5s ease-in-out infinite; transform-origin: 50% 50%; }
        .mf-float { animation: mfFloatHero 4.5s ease-in-out infinite; }
        .mf-stripe {
          background-image: repeating-linear-gradient(
            -45deg,
            ${CELESTE} 0, ${CELESTE} 14px,
            #ffffff 14px, #ffffff 28px
          );
          background-size: 200px 100%;
          animation: mfStripe 6s linear infinite;
          opacity: .85;
        }
        @media (prefers-reduced-motion: reduce) {
          .mf-star, .mf-flag, .mf-float, .mf-stripe { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

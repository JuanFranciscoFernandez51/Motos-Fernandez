import type { Metadata } from "next"
import { TrackVisita } from "@/components/public/track-visita"
import { CatalogoClient } from "../catalogo/catalogo-client"
import { getModelosCatalogo, getMarcasCatalogo } from "@/lib/cached-queries"
import { Watermark } from "@/components/public/ui/watermark"
import { GoldDivider } from "@/components/public/ui/gold-divider"
import { SectionEyebrow } from "@/components/public/ui/section-eyebrow"

/**
 * UNIDADES DISPONIBLES — stock físico real del local.
 *
 * Muestra las unidades que existen físicamente: las que tienen número de
 * chasis o motor cargado. Incluye usadas Y 0KM que ya están en el local
 * (a diferencia del catálogo /0km, que es el sugerido público de modelos
 * que se pueden traer).
 */
export const metadata: Metadata = {
  title: "Unidades disponibles | Motos Fernandez",
  description:
    "Stock físico disponible en el local: motos usadas y 0KM listas para entrega, con garantía, financiación y plan canje en Bahía Blanca.",
}

// Stock físico = todo MENOS las 0KM del catálogo publicitario (modelos
// genéricos sin chasis ni motor que publicamos sin tenerlos). Las usadas
// y las 0KM que están físicas en el local quedan adentro, aunque todavía
// no tengan el chasis/motor tipeado.
const esCatalogo0km = (m: {
  condicion?: string | null
  chasis?: string | null
  motor?: string | null
}) => (m.condicion || "0KM") === "0KM" && !m.chasis?.trim() && !m.motor?.trim()

export default async function DisponiblesPage() {
  const [models, brands] = await Promise.all([
    getModelosCatalogo(),
    getMarcasCatalogo(),
  ])

  const disponibles = models.filter((m) => !esCatalogo0km(m))

  return (
    <>
      <TrackVisita pagina="disponibles" />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325]">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C8C8D0]/[0.06] blur-3xl pointer-events-none" />
        <Watermark position="right" size="xl" opacity="subtle" className="hidden md:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <SectionEyebrow centered variant="gold">
            Stock físico · Entrega inmediata
          </SectionEyebrow>
          <h1 className="mt-5 font-heading text-5xl sm:text-6xl lg:text-7xl text-white text-balance leading-tight">
            Unidades <span className="text-[#C8C8D0]">disponibles</span>
          </h1>
          <GoldDivider variant="ornament" className="mt-7" />
          <p className="mt-7 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Lo que tenemos físicamente en el local, listo para entregar. Usadas
            revisadas por nuestro taller y 0KM en stock, con garantía,
            financiación propia y plan canje.
          </p>
        </div>
      </section>

      {/* ==================== STOCK DISPONIBLE ==================== */}
      <section className="py-12 sm:py-16 bg-[#F8F5FA] dark:bg-neutral-950 min-h-[60vh]">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          {disponibles.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-20">
              Por el momento no hay unidades disponibles publicadas.
            </p>
          ) : (
            <CatalogoClient
              models={JSON.parse(JSON.stringify(disponibles))}
              brands={brands}
            />
          )}
        </div>
      </section>
    </>
  )
}

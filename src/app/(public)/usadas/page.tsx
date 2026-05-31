import type { Metadata } from "next"
import { TrackVisita } from "@/components/public/track-visita"
import { CatalogoClient } from "../catalogo/catalogo-client"
import { getModelosCatalogo, getMarcasCatalogo } from "@/lib/cached-queries"
import { Watermark } from "@/components/public/ui/watermark"
import { GoldDivider } from "@/components/public/ui/gold-divider"
import { SectionEyebrow } from "@/components/public/ui/section-eyebrow"

/**
 * Catálogo de MOTOS USADAS — sección paralela al de 0KM.
 *
 * Reusa CatalogoClient (cards, filtros, badges) filtrando a las unidades
 * con condición USADA. El catálogo general (/catalogo) sigue existiendo
 * como catch-all para todas las CTAs internas.
 */
export const metadata: Metadata = {
  title: "Motos Usadas | Motos Fernandez",
  description:
    "Motos usadas seleccionadas y revisadas, con garantía, financiación y plan canje en Bahía Blanca.",
}

export default async function MotosUsadasPage() {
  const [models, brands] = await Promise.all([
    getModelosCatalogo(),
    getMarcasCatalogo(),
  ])

  const usadas = models.filter((m) => m.condicion === "USADA")

  return (
    <>
      <TrackVisita pagina="usadas" />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325]">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C8C8D0]/[0.06] blur-3xl pointer-events-none" />
        <Watermark position="right" size="xl" opacity="subtle" className="hidden md:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <SectionEyebrow centered variant="gold">
            Seleccionadas · Revisadas
          </SectionEyebrow>
          <h1 className="mt-5 font-heading text-5xl sm:text-6xl lg:text-7xl text-white text-balance leading-tight">
            Motos <span className="text-[#C8C8D0]">Usadas</span>
          </h1>
          <GoldDivider variant="ornament" className="mt-7" />
          <p className="mt-7 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Unidades revisadas por nuestro taller oficial, con garantía,
            financiación propia y plan canje. Consultá disponibilidad.
          </p>
        </div>
      </section>

      {/* ==================== CATÁLOGO USADAS ==================== */}
      <section className="py-12 sm:py-16 bg-[#F8F5FA] dark:bg-neutral-950 min-h-[60vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {usadas.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-20">
              Por el momento no hay motos usadas publicadas.
            </p>
          ) : (
            <CatalogoClient
              models={JSON.parse(JSON.stringify(usadas))}
              brands={brands}
            />
          )}
        </div>
      </section>
    </>
  )
}

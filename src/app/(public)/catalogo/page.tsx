import { TrackVisita } from "@/components/public/track-visita"
import type { Metadata } from "next"
import { CatalogoClient } from "./catalogo-client"
import { getModelosCatalogo, getMarcasCatalogo } from "@/lib/cached-queries"
import { Watermark } from "@/components/public/ui/watermark"
import { GoldDivider } from "@/components/public/ui/gold-divider"
import { SectionEyebrow } from "@/components/public/ui/section-eyebrow"

export const metadata: Metadata = {
  title: "Catálogo | Motos, cuatriciclos, UTV y motos de agua",
  description:
    "Explorá nuestro catálogo completo de motocicletas, cuatriciclos, UTV y motos de agua. Las mejores marcas con financiación en Bahía Blanca.",
}

export default async function ModelosPage() {
  const [models, brands] = await Promise.all([getModelosCatalogo(), getMarcasCatalogo()])

  return (
    <>
      <TrackVisita pagina="catalogo" />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325]">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C9A55C]/[0.06] blur-3xl pointer-events-none" />
        <Watermark position="right" size="xl" opacity="subtle" className="hidden md:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <SectionEyebrow centered variant="gold">
            Stock disponible
          </SectionEyebrow>
          <h1 className="mt-5 font-serif text-5xl sm:text-6xl lg:text-7xl text-white text-balance leading-tight">
            Nuestro <em className="text-[#C9A55C]">catálogo</em>
          </h1>
          <GoldDivider variant="ornament" className="mt-7" />
          <p className="mt-7 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Encontrá el vehículo perfecto para vos. Filtrá por categoría, marca o
            buscá directamente entre todos nuestros modelos.
          </p>
        </div>
      </section>

      {/* ==================== CATALOG ==================== */}
      <section className="py-12 sm:py-16 bg-[#F8F5FA] dark:bg-neutral-950 min-h-[60vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CatalogoClient
            models={JSON.parse(JSON.stringify(models))}
            brands={brands}
          />
        </div>
      </section>
    </>
  )
}

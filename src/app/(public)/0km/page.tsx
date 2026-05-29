import type { Metadata } from "next"
import { CatalogoClient } from "../catalogo/catalogo-client"
import { getModelosCatalogo, getMarcasCatalogo } from "@/lib/cached-queries"
import { Watermark } from "@/components/public/ui/watermark"
import { GoldDivider } from "@/components/public/ui/gold-divider"
import { SectionEyebrow } from "@/components/public/ui/section-eyebrow"

/**
 * Catálogo de MOTOS 0KM — sección paralela al catálogo general.
 *
 * Estado actual: "oculta del menú" — la página existe y funciona, pero
 * NO está linkeada desde el header/footer público. Quien tenga la URL
 * la ve (sin auth). Se usa para armar el catálogo 0KM antes de
 * publicitarlo con pauta.
 *
 * noindex/nofollow para que Google no la indexe mientras está en
 * construcción (cuando esté lista, se saca el robots).
 */
export const metadata: Metadata = {
  title: "Motos 0KM | Motos Fernandez",
  description: "Catálogo de motos 0KM nuevas con entrega inmediata y financiación.",
  robots: { index: false, follow: false },
}

export default async function Motos0kmPage() {
  const [models, brands] = await Promise.all([
    getModelosCatalogo(),
    getMarcasCatalogo(),
  ])

  // Solo 0KM. El resto del flujo (cards, filtros, badges) lo maneja
  // CatalogoClient igual que el catálogo general.
  const ceroKm = models.filter((m) => (m.condicion || "0KM") === "0KM")

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325]">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C8C8D0]/[0.06] blur-3xl pointer-events-none" />
        <Watermark position="right" size="xl" opacity="subtle" className="hidden md:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <SectionEyebrow centered variant="gold">
            Nuevas · Entrega inmediata
          </SectionEyebrow>
          <h1 className="mt-5 font-heading text-5xl sm:text-6xl lg:text-7xl text-white text-balance leading-tight">
            Motos <span className="text-[#C8C8D0]">0KM</span>
          </h1>
          <GoldDivider variant="ornament" className="mt-7" />
          <p className="mt-7 text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Modelos nuevos con garantía oficial, financiación propia y plan
            canje. Elegí color y consultá entrega inmediata.
          </p>
        </div>
      </section>

      {/* ==================== CATÁLOGO 0KM ==================== */}
      <section className="py-12 sm:py-16 bg-[#F8F5FA] dark:bg-neutral-950 min-h-[60vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {ceroKm.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-20">
              Todavía no hay motos 0KM cargadas en esta sección.
            </p>
          ) : (
            <CatalogoClient
              models={JSON.parse(JSON.stringify(ceroKm))}
              brands={brands}
            />
          )}
        </div>
      </section>
    </>
  )
}

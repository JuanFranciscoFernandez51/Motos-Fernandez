import { TrackVisita } from "@/components/public/track-visita"
import type { Metadata } from "next"
import { CatalogoClient } from "./catalogo-client"
import { getModelosCatalogo, getMarcasCatalogo } from "@/lib/cached-queries"

export const metadata: Metadata = {
  title: "Modelos | Catalogo de motos, cuatriciclos, UTV y motos de agua",
  description:
    "Explora nuestro catalogo completo de motocicletas, cuatriciclos, UTV y motos de agua. Las mejores marcas con financiacion en Bahia Blanca.",
}

export default async function ModelosPage() {
  const [models, brands] = await Promise.all([getModelosCatalogo(), getMarcasCatalogo()])

  return (
    <>
      <TrackVisita pagina="catalogo" />
      {/* Hero */}
      <section className="bg-[#1A1A1A] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Catalogo de Modelos
          </h1>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Encuentra el vehiculo perfecto para vos. Filtra por categoria, marca o busca directamente.
          </p>
        </div>
      </section>

      {/* Catalog */}
      <section className="py-12 bg-[#F0F0F0] dark:bg-neutral-950 min-h-[60vh]">
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

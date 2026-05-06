import Link from "next/link"
import Image from "next/image"
import { BUSINESS } from "@/lib/constants"
import { Newspaper, ArrowRight } from "lucide-react"
import { TrackVisita } from "@/components/public/track-visita"
import type { Metadata } from "next"
import { getNoticiasPublicadas } from "@/lib/cached-queries"
import { PageHero } from "@/components/public/ui/page-hero"
import { AnimatedSection } from "@/components/public/ui/animated-section"

export const metadata: Metadata = {
  title: `Noticias | ${BUSINESS.name}`,
  description: `Noticias, novedades y consejos de ${BUSINESS.name}. Enterate de las ultimas novedades en motos, cuatriciclos y mas.`,
  openGraph: {
    title: `Noticias | ${BUSINESS.name}`,
    description: `Noticias y novedades de ${BUSINESS.name}`,
  },
}

export default async function NoticiasPage() {
  const noticias = await getNoticiasPublicadas()

  return (
    <>
      <TrackVisita pagina="noticias" />

      <PageHero
        eyebrow="Blog & novedades"
        title="Noticias y"
        highlight="consejos"
        description="Novedades, lanzamientos y todo el mundo de las motos en un solo lugar."
      />

      <section className="py-16 bg-[#F8F5FA] dark:bg-neutral-950 min-h-[50vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {noticias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Newspaper className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay noticias publicadas aun</p>
              <p className="text-sm mt-1">Volvete a pasar pronto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {noticias.map((noticia, idx) => (
                <AnimatedSection key={noticia.id} animation="fade-up" delay={idx * 80}>
                  <Link
                    href={`/noticias/${noticia.slug}`}
                    className="group h-full flex flex-col rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden shadow-premium-sm hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Imagen */}
                    <div className="relative aspect-video bg-gradient-to-br from-[#F8F5FA] to-[#EFEAF2] dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
                      {noticia.imagen ? (
                        <Image
                          src={noticia.imagen}
                          alt={noticia.titulo}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300">
                          <Newspaper className="h-10 w-10" />
                        </div>
                      )}
                      {noticia.categoria && (
                        <span className="absolute top-3 left-3 bg-gradient-to-r from-[#C9A55C] to-[#E2BE6E] text-[#0E0B12] text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-lg">
                          {noticia.categoria}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      <p className="text-xs text-gray-400 mb-2 font-semibold">
                        {noticia.fechaPublicacion.toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <h2 className="font-serif text-lg font-semibold text-[#1A1A1A] dark:text-white leading-snug group-hover:text-[#6B4F7A] transition-colors line-clamp-2">
                        {noticia.titulo}
                      </h2>
                      {noticia.resumen && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                          {noticia.resumen}
                        </p>
                      )}
                      <span className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-bold text-[#C9A55C] group-hover:gap-2 transition-all">
                        Leer más <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

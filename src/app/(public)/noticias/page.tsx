import Link from "next/link"
import Image from "next/image"
import { BUSINESS } from "@/lib/constants"
import { Newspaper } from "lucide-react"
import { TrackVisita } from "@/components/public/track-visita"
import type { Metadata } from "next"
import { getNoticiasPublicadas } from "@/lib/cached-queries"

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
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1
            className="text-4xl sm:text-5xl font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Noticias
          </h1>
          <p className="mt-3 text-gray-400 text-lg">
            Novedades, consejos y todo sobre el mundo de las motos
          </p>
        </div>
      </div>

      <section className="py-16 bg-[#F0F0F0] dark:bg-neutral-950 min-h-[50vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {noticias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Newspaper className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay noticias publicadas aun</p>
              <p className="text-sm mt-1">Volvete a pasar pronto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {noticias.map((noticia) => (
                <Link
                  key={noticia.id}
                  href={`/noticias/${noticia.slug}`}
                  className="group bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Imagen */}
                  <div className="relative aspect-video bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                    {noticia.imagen ? (
                      <Image
                        src={noticia.imagen}
                        alt={noticia.titulo}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <Newspaper className="h-10 w-10" />
                      </div>
                    )}
                    {noticia.categoria && (
                      <span className="absolute top-3 left-3 bg-[#6B4F7A] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                        {noticia.categoria}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <p className="text-xs text-gray-400 mb-2">
                      {noticia.fechaPublicacion.toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <h2 className="font-bold text-[#1A1A1A] dark:text-white text-lg leading-snug group-hover:text-[#6B4F7A] transition-colors line-clamp-2">
                      {noticia.titulo}
                    </h2>
                    {noticia.resumen && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                        {noticia.resumen}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center text-sm font-semibold text-[#6B4F7A] group-hover:gap-2 transition-all">
                      Leer mas &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

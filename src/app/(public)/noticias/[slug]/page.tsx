export const dynamic = 'force-dynamic'

import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { BUSINESS } from "@/lib/constants"
import { ChevronRight, Newspaper, CalendarDays } from "lucide-react"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

async function getNoticia(slug: string) {
  try {
    return await prisma.noticia.findFirst({
      where: { slug, publicado: true },
    })
  } catch {
    return null
  }
}

async function getRelated(categoria: string | null, excludeId: string) {
  if (!categoria) return []
  try {
    return await prisma.noticia.findMany({
      where: {
        publicado: true,
        categoria,
        id: { not: excludeId },
      },
      orderBy: { fechaPublicacion: "desc" },
      take: 3,
    })
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const noticia = await getNoticia(slug)
  if (!noticia) return { title: "Noticia no encontrada" }

  return {
    title: `${noticia.titulo} | ${BUSINESS.name}`,
    description: noticia.resumen
      ? noticia.resumen.substring(0, 160)
      : `${noticia.titulo} - ${BUSINESS.name}`,
    openGraph: {
      title: noticia.titulo,
      description: noticia.resumen || noticia.titulo,
      images: noticia.imagen ? [noticia.imagen] : [],
      type: "article",
      publishedTime: noticia.fechaPublicacion.toISOString(),
    },
  }
}

export default async function NoticiaDetailPage({ params }: Props) {
  const { slug } = await params
  const noticia = await getNoticia(slug)
  if (!noticia) notFound()

  const related = await getRelated(noticia.categoria, noticia.id)

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-[#1A1A1A] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <ChevronRight className="size-3.5" />
            <Link href="/noticias" className="hover:text-white transition-colors">
              Noticias
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-gray-300 line-clamp-1">{noticia.titulo}</span>
          </nav>
        </div>
      </div>

      <article className="py-12 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Category + date */}
          <div className="flex items-center gap-3 mb-4">
            {noticia.categoria && (
              <span className="bg-[#6B4F7A]/10 text-[#6B4F7A] text-xs font-semibold px-2.5 py-1 rounded-full">
                {noticia.categoria}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <CalendarDays className="size-3.5" />
              {noticia.fechaPublicacion.toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] leading-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {noticia.titulo}
          </h1>

          {/* Featured image */}
          {noticia.imagen && (
            <div className="relative aspect-video rounded-xl overflow-hidden mb-8 bg-gray-100">
              <Image
                src={noticia.imagen}
                alt={noticia.titulo}
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
            </div>
          )}

          {/* Resumen destacado */}
          {noticia.resumen && (
            <div className="border-l-4 border-[#6B4F7A] pl-4 mb-8 text-gray-600 italic text-lg leading-relaxed">
              {noticia.resumen}
            </div>
          )}

          {/* HTML Content */}
          <div
            className="prose prose-gray max-w-none text-gray-700 leading-relaxed
              prose-headings:text-[#1A1A1A] prose-headings:font-bold
              prose-a:text-[#6B4F7A] prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-sm
              prose-strong:text-[#1A1A1A]"
            dangerouslySetInnerHTML={{ __html: noticia.contenido }}
          />

          {/* Back link */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <Link
              href="/noticias"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B4F7A] hover:text-[#8B6F9A] transition-colors"
            >
              &larr; Ver todas las noticias
            </Link>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-12 bg-[#F0F0F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
              Noticias relacionadas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((n) => (
                <Link
                  key={n.id}
                  href={`/noticias/${n.slug}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    {n.imagen ? (
                      <Image
                        src={n.imagen}
                        alt={n.titulo}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <Newspaper className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">
                      {n.fechaPublicacion.toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <h3 className="font-bold text-[#1A1A1A] text-sm leading-snug group-hover:text-[#6B4F7A] transition-colors line-clamp-2">
                      {n.titulo}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

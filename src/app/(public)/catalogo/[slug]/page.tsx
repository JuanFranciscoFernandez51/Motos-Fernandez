export const dynamic = 'force-dynamic'

import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { TrackVisita } from "@/components/public/track-visita"
import { ShareButton } from "@/components/public/share-button"
import { CalculadoraCuotas } from "@/components/public/calculadora-cuotas"
import { WishlistButton } from "@/components/public/wishlist-button"
import { CompareButton } from "@/components/public/compare-button"
import {
  BUSINESS,
  formatPrice,
  getWhatsAppUrl,
  WHATSAPP_MESSAGES,
  CATEGORIA_VEHICULO_LABELS,
  ETIQUETAS_MAP,
} from "@/lib/constants"
import { MessageCircle, ArrowLeft, Bike, CreditCard, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import { ModelGallery } from "./gallery-client"

interface Props {
  params: Promise<{ slug: string }>
}

async function getModel(slug: string) {
  try {
    return await prisma.modelo.findUnique({
      where: { slug, activo: true },
      include: { colores: true },
    })
  } catch {
    return null
  }
}

async function getRelatedModels(
  categoriaVehiculo: string,
  excludeId: string
) {
  try {
    return await prisma.modelo.findMany({
      where: {
        activo: true,
        categoriaVehiculo: categoriaVehiculo as any,
        id: { not: excludeId },
      },
      take: 4,
      orderBy: { orden: "asc" },
    })
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const model = await getModel(slug)
  if (!model) return { title: "Modelo no encontrado" }

  return {
    title: `${model.nombre} ${model.marca}`,
    description: model.descripcion
      ? model.descripcion.substring(0, 160)
      : `${model.nombre} de ${model.marca}. ${model.cilindrada || ""} Disponible en ${BUSINESS.name}, ${BUSINESS.city}.`,
    openGraph: {
      images: model.fotos[0] ? [model.fotos[0]] : [],
    },
  }
}

export default async function ModeloDetailPage({ params }: Props) {
  const { slug } = await params
  const model = await getModel(slug)
  if (!model) notFound()

  const related = await getRelatedModels(model.categoriaVehiculo, model.id)
  const specs = (model.specs as Record<string, string>) || {}
  const financiacion = (model.financiacion as Array<{
    plan: string
    cuota?: number
    entrega?: number
  }>) || []

  const precioFormateado = model.precio
    ? (model.moneda || "ARS") === "USD"
      ? `USD ${model.precio.toLocaleString("es-AR")}`
      : formatPrice(model.precio)
    : undefined

  const whatsappUrl = getWhatsAppUrl(
    WHATSAPP_MESSAGES.modelo({
      nombre: model.nombre,
      marca: model.marca,
      precio: precioFormateado,
      slug: model.slug,
      condicion: model.condicion,
    })
  )

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${model.marca} ${model.nombre}`,
    description: model.descripcion || `${model.nombre} de ${model.marca} disponible en ${BUSINESS.name}`,
    image: model.fotos[0] || undefined,
    brand: { "@type": "Brand", name: model.marca },
    offers: {
      "@type": "Offer",
      priceCurrency: "ARS",
      price: model.precio || undefined,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: BUSINESS.name },
    },
  }

  return (
    <>
      <TrackVisita pagina="modelo-detalle" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="bg-[#1A1A1A] py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/catalogo" className="hover:text-white transition-colors">
              Modelos
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-gray-300">
              {model.marca} {model.nombre}
            </span>
          </nav>
        </div>
      </div>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Gallery + calculadora */}
            <div className="space-y-6">
              <ModelGallery fotos={model.fotos} nombre={model.nombre} />
              {/* Calculadora de cuotas (desktop: debajo de fotos) */}
              {model.precio && (
                <div className="hidden lg:block">
                  <CalculadoraCuotas
                    precio={model.precio}
                    moneda={model.moneda || "ARS"}
                    financiacion={financiacion}
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <span className="inline-block rounded-md bg-[#6B4F7A]/10 px-3 py-1 text-xs font-semibold text-[#6B4F7A] uppercase tracking-wider">
                  {model.marca}
                </span>
                <div className="flex items-center gap-2">
                  <WishlistButton
                    variant="icon"
                    item={{
                      id: model.id,
                      slug: model.slug,
                      nombre: model.nombre,
                      marca: model.marca,
                      fotos: model.fotos,
                      precio: model.precio,
                      moneda: model.moneda || "ARS",
                      cilindrada: model.cilindrada,
                      condicion: model.condicion,
                    }}
                  />
                  <CompareButton
                    variant="icon"
                    item={{
                      id: model.id,
                      slug: model.slug,
                      nombre: model.nombre,
                      marca: model.marca,
                      foto: model.fotos[0] || null,
                      precio: model.precio,
                      moneda: model.moneda || "ARS",
                      cilindrada: model.cilindrada,
                      condicion: model.condicion || "0KM",
                      anio: model.anio,
                      kilometros: model.kilometros,
                      specs: (model.specs as Record<string, unknown> | null) ?? null,
                    }}
                  />
                  <ShareButton
                    variant="icon"
                    title={`${model.marca} ${model.nombre}`}
                    text={`Mirá este ${model.marca} ${model.nombre} en Motos Fernandez`}
                    path={`/catalogo/${model.slug}`}
                  />
                </div>
              </div>
              <h1
                className="mt-3 text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {model.nombre}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${
                  (model.condicion || "0KM") === "0KM"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-orange-100 text-orange-800"
                }`}>
                  {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
                </span>
                {model.etiqueta && ETIQUETAS_MAP[model.etiqueta] && (
                  <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white ${ETIQUETAS_MAP[model.etiqueta].color}`}>
                    {ETIQUETAS_MAP[model.etiqueta].label}
                  </span>
                )}
                <span className="text-sm text-gray-400">{model.anio || new Date().getFullYear()}</span>
                {(model.condicion || "0KM") === "USADA" ? (
                  model.kilometros != null && (
                    <span className="text-sm text-gray-400">· {model.kilometros.toLocaleString("es-AR")} km</span>
                  )
                ) : (
                  <span className="text-sm text-gray-400">· 0 km</span>
                )}
                {model.cilindrada && (
                  <span className="text-sm text-gray-500">· {model.cilindrada}</span>
                )}
                <span className="text-sm text-gray-400">
                  · {CATEGORIA_VEHICULO_LABELS[model.categoriaVehiculo]}
                </span>
              </div>
              {/* Highlight de datos clave para usadas */}
              {(model.condicion || "0KM") === "USADA" && (model.anio || model.kilometros != null) && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {model.anio && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">Año</p>
                      <p className="mt-1 text-2xl font-extrabold text-orange-900">{model.anio}</p>
                    </div>
                  )}
                  {model.kilometros != null && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 font-semibold">Kilómetros</p>
                      <p className="mt-1 text-2xl font-extrabold text-orange-900">
                        {model.kilometros.toLocaleString("es-AR")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {model.observaciones && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{model.observaciones}</p>
                </div>
              )}

              {/* Price */}
              <div className="mt-6 p-5 rounded-xl bg-[#F0F0F0]">
                <p className="text-sm text-gray-500 mb-1">Precio de lista</p>
                <p className="text-3xl font-bold text-[#6B4F7A]">
                  {model.precio
                    ? (model.moneda || "ARS") === "USD"
                      ? `USD ${model.precio.toLocaleString("es-AR")}`
                      : formatPrice(model.precio)
                    : "Consultar"}
                </p>
              </div>

              {/* Calculadora de cuotas (mobile: debajo del precio) */}
              {model.precio && (
                <div className="mt-4 lg:hidden">
                  <CalculadoraCuotas
                    precio={model.precio}
                    moneda={model.moneda || "ARS"}
                    financiacion={financiacion}
                  />
                </div>
              )}

              {/* Description */}
              {model.descripcion && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">
                    Descripcion
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {model.descripcion}
                  </p>
                </div>
              )}

              {/* Colors */}
              {model.colores.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
                    Colores disponibles
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {model.colores.map((color) => (
                      <div key={color.id} className="flex items-center gap-2">
                        <span
                          className="size-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: color.hex }}
                          title={color.nombre}
                        />
                        <span className="text-xs text-gray-600">{color.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
                >
                  <MessageCircle className="size-5" />
                  Consultar por este modelo
                </a>
                <Link
                  href="/financiacion"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#6B4F7A] px-6 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 transition-colors"
                >
                  <CreditCard className="size-4" />
                  Financiacion
                </Link>
              </div>
            </div>
          </div>

          {/* Specs table */}
          {Object.keys(specs).length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-[#1A1A1A] font-heading mb-6">
                Especificaciones tecnicas
              </h2>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {Object.entries(specs).map(([key, value], i) => (
                      <tr
                        key={key}
                        className={i % 2 === 0 ? "bg-white" : "bg-[#F0F0F0]/50"}
                      >
                        <td className="px-5 py-3 text-sm font-medium text-[#4E4B48] w-1/3">
                          {key}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#1A1A1A]">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financiacion plans */}
          {financiacion.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-[#1A1A1A] font-heading mb-6">
                Planes de financiacion
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {financiacion.map((plan, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 bg-white p-6 hover:border-[#6B4F7A]/30 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-[#1A1A1A]">
                      {plan.plan}
                    </h3>
                    {plan.cuota && (
                      <p className="mt-2 text-2xl font-bold text-[#6B4F7A]">
                        {formatPrice(plan.cuota)}
                        <span className="text-sm font-normal text-gray-400">
                          /mes
                        </span>
                      </p>
                    )}
                    {plan.entrega && (
                      <p className="mt-1 text-xs text-gray-500">
                        Entrega: {formatPrice(plan.entrega)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related models */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-[#1A1A1A] font-heading mb-6">
                Modelos relacionados
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((m) => (
                  <Link
                    key={m.id}
                    href={`/catalogo/${m.slug}`}
                    className="group rounded-xl bg-[#F0F0F0] overflow-hidden hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                      {m.fotos[0] ? (
                        <Image
                          src={m.fotos[0]}
                          alt={m.nombre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300">
                          <Bike className="size-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-[#8B6F9A] font-medium">
                        {m.marca}
                      </p>
                      <h3
                        className="text-sm font-bold text-[#1A1A1A] mt-0.5"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {m.nombre}
                      </h3>
                      <p className="text-sm font-bold text-[#6B4F7A] mt-1">
                        {m.precio ? formatPrice(m.precio) : "Consultar"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: model.nombre,
            description: model.descripcion,
            image: model.fotos[0] || undefined,
            brand: { "@type": "Brand", name: model.marca },
            offers: model.precio
              ? {
                  "@type": "Offer",
                  price: model.precio,
                  priceCurrency: "ARS",
                  availability: "https://schema.org/InStock",
                  seller: {
                    "@type": "Organization",
                    name: "Motos Fernandez",
                  },
                }
              : undefined,
          }),
        }}
      />
    </>
  )
}

import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
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
import { getModeloBySlug, getModelosRelacionados } from "@/lib/cached-queries"
import { calcularCuotaDesde } from "@/lib/cuota-helper"
import {
  ModeloViewContentTracker,
  WhatsAppCTA,
  PorQueComprarla,
  BloquePermuta,
  CTAFinal,
  CalculadoraCTA,
  StickyMobileCTA,
} from "@/components/public/modelo-landing-extras"
import { MessageCircle, Bike, CreditCard, ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import { ModelGallery } from "./gallery-client"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const model = await getModeloBySlug(slug)
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
  const model = await getModeloBySlug(slug)
  if (!model) notFound()

  const related = await getModelosRelacionados(model.categoriaVehiculo, model.id)
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

  // Cuota mínima estimada (plazo más largo, anticipo 30%) — para mostrar
  // "Desde X cuotas de $YY.YYY" en el hero. Solo si hay precio.
  const cuotaDesde = model.precio
    ? calcularCuotaDesde(model.precio, financiacion)
    : null

  // Info compacta del modelo que necesitan las islas client para tracking
  // + UI condicional (ej. CTA Final cambia "visitanos" si está en domicilio).
  const modeloInfo = {
    slug: model.slug,
    marca: model.marca,
    nombre: model.nombre,
    precio: model.precio,
    moneda: model.moneda || "ARS",
    categoria: CATEGORIA_VEHICULO_LABELS[model.categoriaVehiculo] || model.categoriaVehiculo,
    condicion: model.condicion || "0KM",
    tipoTenencia: model.tipoTenencia || "EN_LOCAL",
  }

  const monedaActual = model.moneda || "ARS"
  const precioEtiqueta = model.precio
    ? formatPrice(model.precio, monedaActual)
    : null
  const cuotaEtiqueta = cuotaDesde
    ? `${cuotaDesde.plazo} cuotas de ${formatPrice(Math.round(cuotaDesde.cuota), monedaActual)}`
    : null

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
      <ModeloViewContentTracker modelo={modeloInfo} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb premium */}
      <div className="relative bg-gradient-to-r from-[#0E0B12] via-[#15121A] to-[#0E0B12] py-4 border-b border-[#C8C8D0]/10">
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C8C8D0]/30 to-transparent"
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/catalogo" className="hover:text-[#C8C8D0] transition-colors">
              Catálogo
            </Link>
            <ChevronRight className="size-3.5 text-[#C8C8D0]/50" />
            <span className="text-gray-200">
              {model.marca} {model.nombre}
            </span>
          </nav>
        </div>
      </div>

      <section className="py-12 pb-28 lg:pb-12 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Gallery + calculadora */}
            <div className="space-y-6">
              <ModelGallery
                fotos={model.fotos}
                nombre={model.nombre}
                colores={model.colores.map((c) => ({
                  id: c.id,
                  nombre: c.nombre,
                  hex: c.hex,
                  foto: c.foto,
                }))}
              />
              {/* Calculadora de cuotas (desktop: debajo de fotos) */}
              {model.precio && (
                <div className="hidden lg:block">
                  <CalculadoraCuotas
                    precio={model.precio}
                    moneda={model.moneda || "ARS"}
                    financiacion={financiacion}
                  />
                  <CalculadoraCTA modelo={modeloInfo} whatsappHref={whatsappUrl} />
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#C8C8D0]/30 bg-[#C8C8D0]/5 px-3 py-1 text-xs font-bold text-[#C8C8D0] uppercase tracking-[0.18em]">
                  <span className="size-1 rounded-full bg-[#C8C8D0]" />
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
              <h1 className="mt-4 font-heading text-4xl sm:text-5xl lg:text-6xl text-[#1A1A1A] dark:text-white leading-[1.05] text-balance">
                {model.nombre}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${
                  (model.condicion || "0KM") === "0KM"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                    : "bg-orange-100 dark:bg-orange-900/40 text-orange-800"
                }`}>
                  {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
                </span>
                {model.etiqueta && ETIQUETAS_MAP[model.etiqueta] && (
                  <span className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white ${ETIQUETAS_MAP[model.etiqueta].color}`}>
                    {ETIQUETAS_MAP[model.etiqueta].label}
                  </span>
                )}
                {/* Tenencia: dónde se puede ver/comprar la moto.
                    Las 0KM del catálogo no las tenemos físicas → "Consultar
                    disponibilidad" en vez de "En concesionaria". */}
                {(model.condicion || "0KM") === "0KM" ? (
                  <span className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white bg-[#6B4F7A]">
                    CONSULTAR DISPONIBILIDAD
                  </span>
                ) : model.tipoTenencia === "EN_DOMICILIO" ? (
                  <span className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white bg-blue-600">
                    SOLO WEB
                  </span>
                ) : (
                  <span className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white bg-[#6B4F7A]">
                    EN CONCESIONARIA
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">· {model.cilindrada}</span>
                )}
                <span className="text-sm text-gray-400">
                  · {CATEGORIA_VEHICULO_LABELS[model.categoriaVehiculo]}
                </span>
              </div>
              {/* Highlight de datos clave para usadas */}
              {(model.condicion || "0KM") === "USADA" && (model.anio || model.kilometros != null) && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {model.anio && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-300 font-semibold">Año</p>
                      <p className="mt-1 text-2xl font-extrabold text-orange-900">{model.anio}</p>
                    </div>
                  )}
                  {model.kilometros != null && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-300 font-semibold">Kilómetros</p>
                      <p className="mt-1 text-2xl font-extrabold text-orange-900">
                        {model.kilometros.toLocaleString("es-AR")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {model.observaciones && (
                <div className="mt-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Observaciones</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{model.observaciones}</p>
                </div>
              )}

              {/* Price + cuota desde */}
              <div className="mt-6 p-5 rounded-xl bg-[#F0F0F0] dark:bg-neutral-950">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {(model.condicion || "0KM") === "0KM" &&
                  !model.chasis?.trim() &&
                  !model.motor?.trim()
                    ? "Precio sugerido público"
                    : "Precio de lista"}
                </p>
                <p className="text-3xl font-bold text-[#6B4F7A]">
                  {model.precio
                    ? (model.moneda || "ARS") === "USD"
                      ? `USD ${model.precio.toLocaleString("es-AR")}`
                      : formatPrice(model.precio)
                    : "Consultar"}
                </p>
                {cuotaDesde && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Desde{" "}
                    <strong className="text-[#1A1A1A] dark:text-white">
                      {cuotaDesde.plazo} cuotas de{" "}
                      {formatPrice(Math.round(cuotaDesde.cuota), monedaActual)}
                    </strong>
                    <span className="text-xs text-gray-400 ml-1">
                      · {cuotaDesde.modalidadLabel.toLowerCase()} · anticipo{" "}
                      {cuotaDesde.anticipoPct}%
                    </span>
                  </p>
                )}
              </div>

              {/* Calculadora de cuotas (mobile: debajo del precio) */}
              {model.precio && (
                <div className="mt-4 lg:hidden">
                  <CalculadoraCuotas
                    precio={model.precio}
                    moneda={model.moneda || "ARS"}
                    financiacion={financiacion}
                  />
                  <CalculadoraCTA modelo={modeloInfo} whatsappHref={whatsappUrl} />
                </div>
              )}

              {/* Description */}
              {model.descripcion && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-2">
                    Descripcion
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {model.descripcion}
                  </p>
                </div>
              )}

              {/* Los colores ahora se muestran en la galería (selector
                  interactivo que cambia la foto al elegir). */}

              {/* CTA buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <WhatsAppCTA
                  href={whatsappUrl}
                  modelo={modeloInfo}
                  source="hero_button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
                >
                  <MessageCircle className="size-5" />
                  Consultar por este modelo
                </WhatsAppCTA>
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

          {/* Bloque "Por qué comprarla en Motos Fernandez" */}
          <PorQueComprarla />

          {/* Bloque permuta — solo si el modelo la acepta */}
          {model.aceptaPermuta && <BloquePermuta modelo={modeloInfo} />}

          {/* Specs table */}
          {Object.keys(specs).length > 0 && (
            <div className="mt-16">
              <h2 className="font-heading text-3xl sm:text-4xl text-[#1A1A1A] dark:text-white mb-6 leading-tight">
                Especificaciones tecnicas
              </h2>
              <div className="rounded-xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {Object.entries(specs).map(([key, value], i) => (
                      <tr
                        key={key}
                        className={i % 2 === 0 ? "bg-white dark:bg-neutral-900" : "bg-[#F0F0F0] dark:bg-neutral-950/50"}
                      >
                        <td className="px-5 py-3 text-sm font-medium text-[#4E4B48] dark:text-gray-200 w-1/3">
                          {key}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#1A1A1A] dark:text-white">
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
              <h2 className="font-heading text-3xl sm:text-4xl text-[#1A1A1A] dark:text-white mb-6 leading-tight">
                Planes de financiacion
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {financiacion.map((plan, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:border-[#6B4F7A]/30 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-[#1A1A1A] dark:text-white">
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
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Entrega: {formatPrice(plan.entrega)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA final antes de modelos relacionados */}
          <CTAFinal modelo={modeloInfo} whatsappHref={whatsappUrl} />

          {/* Related models */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="font-heading text-3xl sm:text-4xl text-[#1A1A1A] dark:text-white mb-6 leading-tight">
                Modelos relacionados
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((m) => (
                  <Link
                    key={m.id}
                    href={`/catalogo/${m.slug}`}
                    className="group rounded-xl bg-[#F0F0F0] dark:bg-neutral-950 overflow-hidden hover:shadow-md transition-all"
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
                        className="text-sm font-bold text-[#1A1A1A] dark:text-white mt-0.5"
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

      {/* Barra fija mobile con CTA — solo en pagina de modelo */}
      <StickyMobileCTA
        modelo={modeloInfo}
        whatsappHref={whatsappUrl}
        precioEtiqueta={precioEtiqueta}
        cuotaEtiqueta={cuotaEtiqueta}
      />
    </>
  )
}

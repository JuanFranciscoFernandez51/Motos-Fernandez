"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Bike, Star } from "lucide-react"
import { formatPrice } from "@/lib/constants"
import { SelloEnvio, esElegiblePromoEnvio } from "@/components/public/sello-envio"
import {
  CamisetaStyles,
  CamisetaStripes,
  CamisetaBadge,
  CamisetaStars,
} from "@/components/public/camiseta-hover"

export type ModeloHomeItem = {
  id: string
  slug: string
  nombre: string
  marca: string
  anio: number | null
  kilometros: number | null
  condicion: string
  precio: number | null
  moneda: string
  fotos: string[]
  destacado: boolean
  /** "EN_LOCAL" | "EN_DOMICILIO" — usado para mostrar badge SOLO WEB. */
  tipoTenencia?: string | null
  /** Cilindrada ("150cc", "650cc"...) — para el sello de envío gratis. */
  cilindrada?: string | null
  /** "MOTOCICLETA" | "CUATRICICLO" | ... — la promo de envío es solo para motos. */
  categoriaVehiculo?: string | null
}

const ROTATION_MS = 12000 // 12 segundos
const SLOTS_ROTATIVOS = 5 // Cuántas motos rotamos por "página"

/**
 * Grid de motos destacadas para el home.
 * - Primera fila: las destacadas (fijas, no se mueven)
 * - Segunda fila: ventana rotativa de motos del catálogo, cambia cada 12s
 *   con animación suave de fade.
 *
 * Si hay menos destacadas que slots, completamos la primera fila con motos
 * del array rotativo (sin que esas se vuelvan a usar en la rotación).
 */
export function ModelosHomeGrid({
  destacadas: destacadasInput,
  rotativas: rotativasInput,
}: {
  destacadas: ModeloHomeItem[]
  rotativas: ModeloHomeItem[]
}) {
  // Estado Mundial: promo de envío (sello) + efecto "camiseta" en hover.
  const [promoEnvio, setPromoEnvio] = useState(false)
  const [mundial, setMundial] = useState(false)
  useEffect(() => {
    let vivo = true
    fetch("/api/site/mundial")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return
        if (d?.promoEnvio) setPromoEnvio(true)
        if (d?.active) setMundial(true)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  // Unificamos y deduplicamos (destacadas primero) y separamos por condición.
  const vistos = new Set<string>()
  const todas: ModeloHomeItem[] = []
  for (const m of [...destacadasInput, ...rotativasInput]) {
    if (vistos.has(m.id)) continue
    vistos.add(m.id)
    todas.push(m)
  }
  // Ordenamos cada grupo con las destacadas adelante.
  const ordenar = (arr: ModeloHomeItem[]) =>
    [...arr].sort((a, b) => Number(b.destacado) - Number(a.destacado))
  const usadas = ordenar(todas.filter((m) => (m.condicion || "0KM") === "USADA"))
  const ceroKm = ordenar(todas.filter((m) => (m.condicion || "0KM") === "0KM"))

  if (usadas.length === 0 && ceroKm.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
        <Bike className="size-12 mx-auto text-gray-200 mb-4" />
        <p className="text-gray-400">
          Próximamente cargamos nuestro catálogo de modelos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {mundial && <CamisetaStyles />}
      {usadas.length > 0 && (
        <FilaModelos titulo="Usadas" items={usadas} href="/disponibles" hrefLabel="Ver usadas" promoEnvio={promoEnvio} camiseta={mundial} />
      )}
      {ceroKm.length > 0 && (
        <FilaModelos titulo="Motos 0KM" items={ceroKm} href="/0km" hrefLabel="Ver 0KM" promoEnvio={promoEnvio} camiseta={mundial} />
      )}
    </div>
  )
}

/**
 * Una fila de modelos (Usadas o 0KM) con título, link al catálogo
 * correspondiente y rotación suave si hay más de SLOTS_ROTATIVOS.
 */
function FilaModelos({
  titulo,
  items,
  href,
  hrefLabel,
  promoEnvio,
  camiseta,
}: {
  titulo: string
  items: ModeloHomeItem[]
  href: string
  hrefLabel: string
  promoEnvio: boolean
  camiseta: boolean
}) {
  const [pageIndex, setPageIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const totalPaginas = Math.max(1, Math.ceil(items.length / SLOTS_ROTATIVOS))

  useEffect(() => {
    if (totalPaginas <= 1) return
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setPageIndex((i) => (i + 1) % totalPaginas)
        setFading(false)
      }, 400)
    }, ROTATION_MS)
    return () => clearInterval(interval)
  }, [totalPaginas])

  const inicio = pageIndex * SLOTS_ROTATIVOS
  const ventana = items.slice(inicio, inicio + SLOTS_ROTATIVOS)

  return (
    <div>
      {/* Header de la fila: título + link al catálogo */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-heading text-2xl sm:text-3xl text-[#1A1A1A] dark:text-white">
          {titulo}
        </h3>
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#6B4F7A] hover:text-[#8B6F9A] transition-colors whitespace-nowrap"
        >
          {hrefLabel}
          <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Indicador de rotación */}
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1 rounded-full transition-all duration-500 ${
                i === pageIndex ? "w-8 bg-[#6B4F7A]" : "w-1.5 bg-gray-300 dark:bg-neutral-700"
              }`}
            />
          ))}
        </div>
      )}

      <div
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 transition-opacity duration-500 ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {ventana.map((model) => (
          <ModeloCard key={model.id} model={model} pinned={model.destacado} promoEnvio={promoEnvio} camiseta={camiseta} />
        ))}
      </div>
    </div>
  )
}

function ModeloCard({
  model,
  pinned,
  promoEnvio,
  camiseta,
}: {
  model: ModeloHomeItem
  pinned: boolean
  promoEnvio: boolean
  camiseta: boolean
}) {
  const conSello = promoEnvio && esElegiblePromoEnvio(model)
  return (
    <div className="relative h-full">
      {/* Sello promo envío gratis (usadas ≤650cc) — afuera del overflow-hidden
          para que sobresalga de la card */}
      {conSello && (
        <div className="absolute -top-4 -left-4 z-30 pointer-events-none">
          <SelloEnvio size={78} idSuffix={model.id} />
        </div>
      )}
      <Link
        href={`/catalogo/${model.slug}`}
        className={`moto-card group relative flex flex-col h-full rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden shadow-premium-sm hover:shadow-premium-lg transition-all duration-300 ${
          camiseta
            ? "hover:-translate-y-2 ring-1 ring-transparent hover:ring-2 hover:ring-[#75AADB]"
            : "hover:-translate-y-1"
        }`}
      >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-[#F8F5FA] to-[#EFEAF2] dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
        {model.fotos[0] ? (
          <Image
            src={model.fotos[0]}
            alt={model.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-200">
            <Bike className="size-10" />
          </div>
        )}
        {/* Efecto camiseta (Mundial): rayas + badge VAMOS, solo en hover */}
        {camiseta && <CamisetaStripes />}
        {camiseta && !conSello && <CamisetaBadge className="top-3 left-3" />}

        {/* Badges — todos en una sola columna a la derecha para que NUNCA se
            superpongan. Condición + (destacado) + (0KM) consultar. */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1 max-w-[80%]">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
              (model.condicion || "0KM") === "0KM"
                ? "bg-emerald-500 text-white"
                : "bg-orange-500 text-white"
            }`}
          >
            {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
          </span>
          {pinned && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#0E0B12]/85 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white">
              <Star className="size-2.5 fill-[#C8C8D0] text-[#C8C8D0]" />
              Destacado
            </span>
          )}
          {/* Solo 0KM: "Consultar disponibilidad" (las usadas no llevan
              badge de tenencia, queda más limpio). */}
          {(model.condicion || "0KM") === "0KM" && (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-[#6B4F7A] text-white text-right"
              title="Consultanos disponibilidad y entrega de esta unidad 0KM"
            >
              CONSULTAR DISPONIBILIDAD
            </span>
          )}
        </div>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.18em]">
          {model.marca}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h3 className="font-heading text-base font-bold text-[#1A1A1A] dark:text-white truncate">
            {model.nombre}
          </h3>
          {camiseta && <CamisetaStars />}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {(model.condicion || "0KM") === "USADA" ? (
            <>
              {model.anio && <span>{model.anio}</span>}
              {model.kilometros != null && (
                <span>
                  {model.anio ? " · " : ""}
                  {model.kilometros.toLocaleString("es-AR")} km
                </span>
              )}
            </>
          ) : (
            <>
              <span>{model.anio || new Date().getFullYear()}</span>
              <span> · 0 km</span>
            </>
          )}
        </p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">
              Precio
            </p>
            <p className="moto-precio text-lg font-bold text-[#3D2649] dark:text-[#C39BD3] leading-tight">
              {model.precio
                ? (model.moneda || "ARS") === "USD"
                  ? `USD ${model.precio.toLocaleString("es-AR")}`
                  : formatPrice(model.precio)
                : "Consultar"}
            </p>
          </div>
          <ArrowRight className="size-4 text-[#6B4F7A] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      </Link>
    </div>
  )
}

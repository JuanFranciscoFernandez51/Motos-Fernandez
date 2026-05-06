"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Bike, Star } from "lucide-react"
import { formatPrice } from "@/lib/constants"
import { AnimatedSection } from "@/components/public/ui/animated-section"

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
  // Si no hay 5 destacadas, completamos con las primeras del rotativo
  const SLOTS_FIJOS = 5
  const fijas: ModeloHomeItem[] = [...destacadasInput.slice(0, SLOTS_FIJOS)]
  const usadasIds = new Set(fijas.map((m) => m.id))
  const rotativasDisponibles = rotativasInput.filter((m) => !usadasIds.has(m.id))

  if (fijas.length < SLOTS_FIJOS) {
    const faltan = SLOTS_FIJOS - fijas.length
    const completar = rotativasDisponibles.slice(0, faltan)
    fijas.push(...completar)
    completar.forEach((m) => usadasIds.add(m.id))
  }
  const restantes = rotativasInput.filter((m) => !usadasIds.has(m.id))

  // Ventana rotativa
  const [pageIndex, setPageIndex] = useState(0)
  const [fading, setFading] = useState(false)

  // Calcular cuántas páginas tenemos en función de SLOTS_ROTATIVOS
  const totalPaginas =
    restantes.length > 0
      ? Math.max(1, Math.ceil(restantes.length / SLOTS_ROTATIVOS))
      : 0

  useEffect(() => {
    if (totalPaginas <= 1) return // No hace falta rotar
    const interval = setInterval(() => {
      // Fade out → cambio página → fade in
      setFading(true)
      setTimeout(() => {
        setPageIndex((i) => (i + 1) % totalPaginas)
        setFading(false)
      }, 400) // duración del fade-out
    }, ROTATION_MS)
    return () => clearInterval(interval)
  }, [totalPaginas])

  // Slice de la página actual
  const inicio = pageIndex * SLOTS_ROTATIVOS
  const fin = inicio + SLOTS_ROTATIVOS
  const ventanaActual = restantes.slice(inicio, fin)

  // Si no hay nada para rotar, solo mostramos las fijas
  if (fijas.length === 0 && ventanaActual.length === 0) {
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
    <div className="space-y-5">
      {/* Primera fila — destacadas FIJAS */}
      {fijas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {fijas.map((model, idx) => (
            <AnimatedSection key={model.id} animation="fade-up" delay={idx * 80}>
              <ModeloCard model={model} pinned={destacadasInput.some(d => d.id === model.id)} />
            </AnimatedSection>
          ))}
        </div>
      )}

      {/* Segunda fila — ROTATIVAS con fade */}
      {ventanaActual.length > 0 && (
        <div className="relative">
          {/* Indicador sutil de rotación (solo si hay más de una página) */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {Array.from({ length: totalPaginas }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === pageIndex
                      ? "w-8 bg-[#6B4F7A]"
                      : "w-1.5 bg-gray-300 dark:bg-neutral-700"
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
            {ventanaActual.map((model) => (
              <ModeloCard key={model.id} model={model} pinned={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModeloCard({
  model,
  pinned,
}: {
  model: ModeloHomeItem
  pinned: boolean
}) {
  return (
    <Link
      href={`/catalogo/${model.slug}`}
      className="group relative flex flex-col h-full rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden shadow-premium-sm hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1"
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

        {/* Badges */}
        {pinned && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#0E0B12]/85 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white">
            <Star className="size-2.5 fill-[#C8C8D0] text-[#C8C8D0]" />
            Destacado
          </div>
        )}
        <span
          className={`absolute top-3 right-3 rounded-md px-2 py-0.5 text-[10px] font-bold ${
            (model.condicion || "0KM") === "0KM"
              ? "bg-emerald-500 text-white"
              : "bg-orange-500 text-white"
          }`}
        >
          {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
        </span>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.18em]">
          {model.marca}
        </p>
        <h3 className="mt-1 font-heading text-base font-bold text-[#1A1A1A] dark:text-white truncate">
          {model.nombre}
        </h3>
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
            <p className="text-lg font-bold text-[#3D2649] dark:text-[#C39BD3] leading-tight">
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
  )
}

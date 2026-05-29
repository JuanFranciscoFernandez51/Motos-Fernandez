"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { Bike, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"

type ColorOption = {
  id: string
  nombre: string
  hex: string
  foto: string | null
}

export function ModelGallery({
  fotos,
  nombre,
  colores = [],
}: {
  fotos: string[]
  nombre: string
  colores?: ColorOption[]
}) {
  // Galería combinada: las fotos del modelo + las fotos de cada color
  // que tenga una (sin duplicar las que ya están). Así al elegir un
  // color, saltamos a su foto dentro de la misma galería.
  const coloresConFoto = colores.filter(
    (c): c is ColorOption & { foto: string } => !!c.foto
  )
  const fotos2 = [
    ...fotos,
    ...coloresConFoto
      .map((c) => c.foto)
      .filter((f) => !fotos.includes(f)),
  ]
  const galeria = fotos2.length > 0 ? fotos2 : fotos

  const [current, setCurrent] = useState(0)
  const [colorSel, setColorSel] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Mapea cada color (con foto) al índice de su foto en la galería.
  const indiceDeColor = (c: ColorOption): number =>
    c.foto ? galeria.indexOf(c.foto) : -1

  const seleccionarColor = (c: ColorOption) => {
    setColorSel(c.id)
    const idx = indiceDeColor(c)
    if (idx >= 0) setCurrent(idx)
  }
  // Refs para gestionar swipe en mobile
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const next = useCallback(
    () => setCurrent((p) => (p === galeria.length - 1 ? 0 : p + 1)),
    [galeria.length]
  )
  const prev = useCallback(
    () => setCurrent((p) => (p === 0 ? galeria.length - 1 : p - 1)),
    [galeria.length]
  )

  // Cuando el lightbox está abierto: ESC cierra, ← → navegan, body sin scroll
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false)
      else if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxOpen, next, prev])

  // Swipe handlers (mobile): horizontal navega, vertical hacia abajo cierra
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    const THRESHOLD = 50
    if (absX > absY && absX > THRESHOLD) {
      if (dx < 0) next()
      else prev()
    } else if (absY > absX && dy > THRESHOLD) {
      // swipe down cierra
      setLightboxOpen(false)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (galeria.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-[#F0F0F0] dark:bg-neutral-950 flex items-center justify-center">
        <Bike className="size-16 text-gray-300" />
      </div>
    )
  }

  return (
    <div>
      {/* Main image — clickeable abre lightbox */}
      <div className="relative aspect-[4/3] rounded-xl bg-[#F0F0F0] dark:bg-neutral-950 overflow-hidden group">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute inset-0 cursor-zoom-in"
          aria-label="Ampliar foto"
        >
          <Image
            src={galeria[current]}
            alt={`${nombre} - Foto ${current + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </button>
        {/* Hint visual de zoom (top-right) */}
        <div className="pointer-events-none absolute top-3 right-3 size-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="size-4" />
        </div>
        {galeria.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm z-10"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm z-10"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {galeria.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrent(i)
                  }}
                  className={`size-2 rounded-full transition-colors ${
                    i === current ? "bg-white" : "bg-white/40"
                  }`}
                  aria-label={`Ir a foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {galeria.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {galeria.slice(0, 5).map((foto, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
                i === current
                  ? "border-[#6B4F7A]"
                  : "border-transparent hover:border-gray-300 dark:border-neutral-700"
              }`}
            >
              <Image
                src={foto}
                alt={`${nombre} - Miniatura ${i + 1}`}
                fill
                className="object-cover"
                sizes="100px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Selector de colores — tocar un color con foto cambia la imagen
          principal. Los colores sin foto se muestran informativos. */}
      {colores.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-[#1A1A1A] dark:text-white uppercase tracking-wider mb-2">
            {colorSel
              ? `Color: ${colores.find((c) => c.id === colorSel)?.nombre || ""}`
              : "Colores disponibles"}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colores.map((color) => {
              const tieneFoto = !!color.foto
              const activo = colorSel === color.id
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => tieneFoto && seleccionarColor(color)}
                  title={
                    color.nombre + (tieneFoto ? "" : " (sin foto específica)")
                  }
                  className={`group relative flex items-center gap-1.5 rounded-full border pl-1 pr-3 py-1 transition-all ${
                    activo
                      ? "border-[#6B4F7A] ring-2 ring-[#6B4F7A]/30 bg-[#6B4F7A]/5"
                      : "border-gray-200 dark:border-neutral-700 hover:border-[#6B4F7A]/50"
                  } ${tieneFoto ? "cursor-pointer" : "cursor-default opacity-80"}`}
                >
                  <span
                    className="size-6 rounded-full border border-black/10 shadow-sm shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    {color.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxOpen(false)
            }}
            className="absolute top-4 right-4 z-10 size-12 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-6" />
          </button>

          {/* Counter */}
          {galeria.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm backdrop-blur-sm">
              {current + 1} / {galeria.length}
            </div>
          )}

          {/* Prev button */}
          {galeria.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Image (object-contain para ver completa) */}
          <div
            className="relative w-[95vw] h-[90vh] max-w-[95vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galeria[current]}
              alt={`${nombre} - Foto ${current + 1}`}
              fill
              className="object-contain"
              sizes="95vw"
              quality={95}
              priority
            />
          </div>

          {/* Next button */}
          {galeria.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Thumbnails strip (en pantalla grande) */}
          {galeria.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden sm:flex gap-2 max-w-[90vw] overflow-x-auto px-2">
              {galeria.map((foto, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrent(i)
                  }}
                  className={`relative size-16 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    i === current ? "border-white" : "border-white/30 hover:border-white/60"
                  }`}
                >
                  <Image
                    src={foto}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

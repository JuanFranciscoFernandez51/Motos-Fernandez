"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { Bike, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"

export function ModelGallery({
  fotos,
  nombre,
}: {
  fotos: string[]
  nombre: string
}) {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const next = useCallback(
    () => setCurrent((p) => (p === fotos.length - 1 ? 0 : p + 1)),
    [fotos.length]
  )
  const prev = useCallback(
    () => setCurrent((p) => (p === 0 ? fotos.length - 1 : p - 1)),
    [fotos.length]
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

  if (fotos.length === 0) {
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
            src={fotos[current]}
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
        {fotos.length > 1 && (
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
              {fotos.map((_, i) => (
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
      {fotos.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {fotos.slice(0, 5).map((foto, i) => (
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

      {/* Lightbox modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
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
          {fotos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm backdrop-blur-sm">
              {current + 1} / {fotos.length}
            </div>
          )}

          {/* Prev button */}
          {fotos.length > 1 && (
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
            className="relative w-full h-full max-w-7xl max-h-[90vh] m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={fotos[current]}
              alt={`${nombre} - Foto ${current + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              quality={95}
              priority
            />
          </div>

          {/* Next button */}
          {fotos.length > 1 && (
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
          {fotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden sm:flex gap-2 max-w-[90vw] overflow-x-auto px-2">
              {fotos.map((foto, i) => (
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

"use client"

import { useState } from "react"
import Image from "next/image"
import { Bike, ChevronLeft, ChevronRight } from "lucide-react"

export function ModelGallery({
  fotos,
  nombre,
}: {
  fotos: string[]
  nombre: string
}) {
  const [current, setCurrent] = useState(0)

  if (fotos.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-[#F0F0F0] dark:bg-neutral-950 flex items-center justify-center">
        <Bike className="size-16 text-gray-300" />
      </div>
    )
  }

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-[4/3] rounded-xl bg-[#F0F0F0] dark:bg-neutral-950 overflow-hidden">
        <Image
          src={fotos[current]}
          alt={`${nombre} - Foto ${current + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
        {fotos.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrent((prev) => (prev === 0 ? fotos.length - 1 : prev - 1))
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() =>
                setCurrent((prev) => (prev === fotos.length - 1 ? 0 : prev + 1))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`size-2 rounded-full transition-colors ${
                    i === current ? "bg-white dark:bg-neutral-900" : "bg-white/40 dark:bg-neutral-900/40"
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
    </div>
  )
}

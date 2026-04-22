"use client"

import Link from "next/link"
import Image from "next/image"
import { useWishlist } from "@/components/public/wishlist-provider"
import { Heart, Trash2, Bike, ArrowRight } from "lucide-react"
import { TrackVisita } from "@/components/public/track-visita"
import { formatPrice } from "@/lib/constants"

export default function FavoritosPage() {
  const { items, removeFromWishlist, clear } = useWishlist()

  return (
    <>
      <TrackVisita pagina="favoritos" />

      {/* Hero */}
      <section className="bg-[#1A1A1A] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-[#9B59B6] uppercase tracking-wider font-semibold mb-2">
            <Heart className="size-4 fill-current" />
            Tus favoritos
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
            Modelos guardados
          </h1>
          <p className="mt-3 text-gray-400 font-body max-w-2xl text-sm">
            {items.length === 0
              ? "Todavía no tenés modelos guardados. Tocá el corazón en cualquier moto del catálogo para agregarla."
              : `Tenés ${items.length} ${items.length === 1 ? "modelo guardado" : "modelos guardados"}.`}
          </p>
        </div>
      </section>

      {/* Lista */}
      <section className="py-12 bg-[#F0F0F0] min-h-[60vh]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {items.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center max-w-md mx-auto">
              <Heart className="size-12 text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Tu lista de favoritos está vacía.
              </p>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
              >
                Explorar catálogo
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={clear}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  Vaciar lista
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl bg-white overflow-hidden hover:shadow-lg transition-all relative"
                  >
                    <Link href={`/catalogo/${item.slug}`}>
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        {item.fotos[0] ? (
                          <Image
                            src={item.fotos[0]}
                            alt={item.nombre}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-200">
                            <Bike className="size-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-semibold text-[#8B6F9A] uppercase tracking-wider truncate">
                          {item.marca}
                        </p>
                        <h3 className="mt-0.5 text-sm font-bold text-[#1A1A1A] truncate">
                          {item.nombre}
                        </h3>
                        {item.cilindrada && (
                          <p className="text-[10px] text-gray-400">{item.cilindrada}</p>
                        )}
                        <p className="mt-2 text-sm font-bold text-[#6B4F7A]">
                          {item.precio
                            ? (item.moneda || "ARS") === "USD"
                              ? `USD ${item.precio.toLocaleString("es-AR")}`
                              : formatPrice(item.precio)
                            : "Consultar"}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-2 right-2 size-8 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                      aria-label="Quitar de favoritos"
                    >
                      <Trash2 className="size-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

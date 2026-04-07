"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/constants"
import { trackViewContent, trackInitiateCheckout } from "@/lib/pixel-events"

export default function CarritoPage() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice } = useCart()

  useEffect(() => {
    if (items.length > 0) {
      trackViewContent("Carrito", totalPrice)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="bg-[#F0F0F0] min-h-screen">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Tu Carrito
          </h1>
          {totalItems > 0 && (
            <p className="mt-1 text-sm text-gray-400">
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="size-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              Explorá nuestra tienda y encontrá lo que necesitás.
            </p>
            <Link
              href="/tienda"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              Ir a la tienda
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items list */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const key = `${item.id}-${item.talle ?? "sin-talle"}`
                const precioUnitario = item.precioOferta ?? item.precio

                return (
                  <div
                    key={key}
                    className="flex gap-4 rounded-xl bg-white p-4 shadow-sm"
                  >
                    {/* Image */}
                    <div className="relative size-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {item.foto ? (
                        <Image
                          src={item.foto}
                          alt={item.nombre}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300">
                          <ShoppingBag className="size-8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/tienda/${item.slug}`}
                            className="text-sm font-semibold text-[#1A1A1A] hover:text-[#6B4F7A] line-clamp-2 transition-colors"
                          >
                            {item.nombre}
                          </Link>
                          {item.talle && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Talle: <span className="font-medium">{item.talle}</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id, item.talle)}
                          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.talle, item.cantidad - 1)
                            }
                            className="flex items-center justify-center size-7 rounded-md text-gray-600 hover:bg-white hover:text-[#6B4F7A] transition-colors"
                            aria-label="Reducir cantidad"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-[#1A1A1A]">
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.talle, item.cantidad + 1)
                            }
                            className="flex items-center justify-center size-7 rounded-md text-gray-600 hover:bg-white hover:text-[#6B4F7A] transition-colors"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="text-base font-bold text-[#6B4F7A]">
                            {formatPrice(precioUnitario * item.cantidad)}
                          </p>
                          {item.cantidad > 1 && (
                            <p className="text-xs text-gray-400">
                              {formatPrice(precioUnitario)} c/u
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-5">
                  Resumen del pedido
                </h2>

                <div className="space-y-3 border-b border-gray-100 pb-4 mb-4">
                  {items.map((item) => {
                    const key = `${item.id}-${item.talle ?? "sin-talle"}`
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 line-clamp-1 flex-1 mr-2">
                          {item.nombre}
                          {item.talle && ` (${item.talle})`} x{item.cantidad}
                        </span>
                        <span className="font-medium text-[#1A1A1A] shrink-0">
                          {formatPrice((item.precioOferta ?? item.precio) * item.cantidad)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between mb-6">
                  <span className="text-base font-semibold text-[#1A1A1A]">Total</span>
                  <span className="text-xl font-bold text-[#6B4F7A]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  onClick={() => trackInitiateCheckout(totalPrice)}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#6B4F7A] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
                >
                  Ir al checkout
                  <ArrowRight className="size-5" />
                </Link>

                <Link
                  href="/tienda"
                  className="mt-3 flex items-center justify-center w-full rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
                >
                  Seguir comprando
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

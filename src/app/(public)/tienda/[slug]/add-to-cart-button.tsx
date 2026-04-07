"use client"

import { useState } from "react"
import { ShoppingBag, Check } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { trackAddToCart } from "@/lib/pixel-events"

interface AddToCartButtonProps {
  producto: {
    id: string
    nombre: string
    precio: number
    precioOferta?: number | null
    fotos: string[]
    slug: string
    categoriaId: string
    talles: string[]
    stockPorTalle: Record<string, number> | null
    stock: number
  }
}

export function AddToCartButton({ producto }: AddToCartButtonProps) {
  const { addItem } = useCart()
  const [selectedTalle, setSelectedTalle] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState("")

  const hasTalles = producto.talles.length > 0
  const stockPorTalle = producto.stockPorTalle ?? {}

  const handleAdd = () => {
    setError("")

    if (hasTalles && !selectedTalle) {
      setError("Seleccioná un talle antes de agregar al carrito")
      return
    }

    // Check stock
    if (hasTalles && selectedTalle) {
      const stockTalle = stockPorTalle[selectedTalle] ?? 0
      if (stockTalle === 0) {
        setError("Sin stock para este talle")
        return
      }
    } else if (!hasTalles && producto.stock === 0) {
      setError("Sin stock")
      return
    }

    addItem({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      precioOferta: producto.precioOferta,
      foto: producto.fotos[0] ?? undefined,
      slug: producto.slug,
      talle: selectedTalle ?? undefined,
      categoriaId: producto.categoriaId,
    })

    trackAddToCart(producto.nombre, producto.precioOferta ?? producto.precio)

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const isOutOfStock = !hasTalles && producto.stock === 0

  return (
    <div className="space-y-3">
      {/* Talle selector */}
      {hasTalles && (
        <div>
          <p className="text-sm font-medium text-[#1A1A1A] mb-2">
            Seleccioná un talle:
          </p>
          <div className="flex flex-wrap gap-2">
            {producto.talles.map((talle) => {
              const stock = stockPorTalle[talle] ?? 0
              const isSelected = selectedTalle === talle
              const sinStock = stock === 0

              return (
                <button
                  key={talle}
                  type="button"
                  disabled={sinStock}
                  onClick={() => {
                    setSelectedTalle(talle)
                    setError("")
                  }}
                  className={`flex items-center justify-center rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                    sinStock
                      ? "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                      : isSelected
                      ? "border-[#6B4F7A] bg-[#6B4F7A] text-white"
                      : "border-[#6B4F7A] text-[#6B4F7A] hover:bg-[#6B4F7A]/10"
                  }`}
                >
                  {talle}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={isOutOfStock}
        className={`flex items-center justify-center gap-2 w-full rounded-lg px-6 py-3.5 text-base font-semibold transition-all ${
          added
            ? "bg-green-600 text-white"
            : isOutOfStock
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#6B4F7A] text-white hover:bg-[#8B6F9A]"
        }`}
      >
        {added ? (
          <>
            <Check className="size-5" />
            Agregado al carrito
          </>
        ) : isOutOfStock ? (
          <>
            <ShoppingBag className="size-5" />
            Sin stock
          </>
        ) : (
          <>
            <ShoppingBag className="size-5" />
            Agregar al carrito
          </>
        )}
      </button>
    </div>
  )
}

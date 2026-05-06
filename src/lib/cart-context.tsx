"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export interface CartItem {
  id: string
  nombre: string
  precio: number
  precioOferta?: number | null
  foto?: string
  slug: string
  talle?: string
  cantidad: number
  categoriaId: string
}

export interface CuponAplicado {
  codigo: string
  porcentaje: number
  montoMaximo: number | null
  montoMinimo: number | null
  descripcion: string | null
  aplicaA: string[]
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "cantidad">) => void
  removeItem: (id: string, talle?: string) => void
  updateQuantity: (id: string, talle: string | undefined, cantidad: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  // Cupón aplicado en el carrito (persiste entre páginas)
  cupon: CuponAplicado | null
  aplicarCupon: (cupon: CuponAplicado) => void
  quitarCupon: () => void
  descuento: number
  totalConDescuento: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = "mf-cart"
const CUPON_STORAGE_KEY = "mf-cart-cupon"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [cupon, setCupon] = useState<CuponAplicado | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
      const storedCupon = localStorage.getItem(CUPON_STORAGE_KEY)
      if (storedCupon) {
        setCupon(JSON.parse(storedCupon))
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true)
  }, [])

  // Persist items
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore storage errors
    }
  }, [items, hydrated])

  // Persist cupón
  useEffect(() => {
    if (!hydrated) return
    try {
      if (cupon) {
        localStorage.setItem(CUPON_STORAGE_KEY, JSON.stringify(cupon))
      } else {
        localStorage.removeItem(CUPON_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
  }, [cupon, hydrated])

  const addItem = useCallback((item: Omit<CartItem, "cantidad">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.id === item.id && i.talle === item.talle
      )
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.talle === item.talle
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, { ...item, cantidad: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string, talle?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.id === id && i.talle === talle))
    )
  }, [])

  const updateQuantity = useCallback(
    (id: string, talle: string | undefined, cantidad: number) => {
      if (cantidad <= 0) {
        setItems((prev) =>
          prev.filter((i) => !(i.id === id && i.talle === talle))
        )
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id && i.talle === talle ? { ...i, cantidad } : i
          )
        )
      }
    },
    []
  )

  const clearCart = useCallback(() => {
    setItems([])
    setCupon(null)
  }, [])

  const aplicarCupon = useCallback((c: CuponAplicado) => {
    setCupon(c)
  }, [])

  const quitarCupon = useCallback(() => {
    setCupon(null)
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)
  const totalPrice = items.reduce(
    (sum, i) => sum + (i.precioOferta ?? i.precio) * i.cantidad,
    0
  )

  // Calcular descuento
  let descuento = 0
  if (cupon && totalPrice > 0) {
    if (!cupon.montoMinimo || totalPrice >= cupon.montoMinimo) {
      descuento = Math.floor((totalPrice * cupon.porcentaje) / 100)
      if (cupon.montoMaximo && descuento > cupon.montoMaximo) {
        descuento = cupon.montoMaximo
      }
    }
  }
  const totalConDescuento = Math.max(0, totalPrice - descuento)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        cupon,
        aplicarCupon,
        quitarCupon,
        descuento,
        totalConDescuento,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}

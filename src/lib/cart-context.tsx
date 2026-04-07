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

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "cantidad">) => void
  removeItem: (id: string, talle?: string) => void
  updateQuantity: (id: string, talle: string | undefined, cantidad: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = "mf-cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever items change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore storage errors
    }
  }, [items, hydrated])

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
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)
  const totalPrice = items.reduce(
    (sum, i) => sum + (i.precioOferta ?? i.precio) * i.cantidad,
    0
  )

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

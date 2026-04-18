"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export interface WishlistItem {
  id: string
  slug: string
  nombre: string
  marca: string
  fotos: string[]
  precio: number | null
  moneda: string
  cilindrada: string | null
  condicion?: string
}

interface WishlistContextValue {
  items: WishlistItem[]
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (id: string) => void
  toggle: (item: WishlistItem) => void
  isInWishlist: (id: string) => boolean
  clear: () => void
  count: number
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

const STORAGE_KEY = "mf_wishlist_v1"

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hidratación desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setItems(parsed)
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Persistir cambios
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }, [items, hydrated])

  const addToWishlist = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev
      return [...prev, item]
    })
  }, [])

  const removeFromWishlist = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const toggle = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id)
      }
      return [...prev, item]
    })
  }, [])

  const isInWishlist = useCallback(
    (id: string) => items.some((p) => p.id === id),
    [items]
  )

  const clear = useCallback(() => setItems([]), [])

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        toggle,
        isInWishlist,
        clear,
        count: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error("useWishlist debe usarse dentro de WishlistProvider")
  }
  return ctx
}

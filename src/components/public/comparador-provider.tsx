"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

export interface CompareItem {
  id: string
  slug: string
  nombre: string
  marca: string
  foto: string | null
  precio: number | null
  moneda: string
  cilindrada: string | null
  condicion: string
  anio: number | null
  kilometros: number | null
  specs: Record<string, unknown> | null
}

interface ComparadorContextType {
  compareItems: CompareItem[]
  addToCompare: (item: CompareItem) => void
  removeFromCompare: (id: string) => void
  clearCompare: () => void
  isInCompare: (id: string) => boolean
  hydrated: boolean
}

const ComparadorContext = createContext<ComparadorContextType | null>(null)

const STORAGE_KEY = "mf_compare_v1"
const MAX_ITEMS = 3

export function ComparadorProvider({ children }: { children: React.ReactNode }) {
  const [compareItems, setCompareItems] = useState<CompareItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setCompareItems(parsed.slice(0, MAX_ITEMS))
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Persist
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareItems))
    } catch {
      // ignore
    }
  }, [compareItems, hydrated])

  const addToCompare = useCallback((item: CompareItem) => {
    setCompareItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev
      if (prev.length >= MAX_ITEMS) {
        if (typeof window !== "undefined") {
          window.alert("Máximo 3 modelos para comparar")
        }
        return prev
      }
      return [...prev, item]
    })
  }, [])

  const removeFromCompare = useCallback((id: string) => {
    setCompareItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearCompare = useCallback(() => {
    setCompareItems([])
  }, [])

  const isInCompare = useCallback(
    (id: string) => compareItems.some((p) => p.id === id),
    [compareItems]
  )

  return (
    <ComparadorContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        hydrated,
      }}
    >
      {children}
    </ComparadorContext.Provider>
  )
}

export function useCompare(): ComparadorContextType {
  const ctx = useContext(ComparadorContext)
  if (!ctx)
    throw new Error("useCompare must be used within ComparadorProvider")
  return ctx
}

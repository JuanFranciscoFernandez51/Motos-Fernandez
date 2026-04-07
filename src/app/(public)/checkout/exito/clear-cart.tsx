"use client"

import { useEffect } from "react"
import { useCart } from "@/lib/cart-context"

export function ClearCart() {
  const { clearCart } = useCart()
  useEffect(() => {
    clearCart()
  }, [clearCart])
  return null
}

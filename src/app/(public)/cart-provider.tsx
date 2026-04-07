"use client"

import { CartProvider } from "@/lib/cart-context"

export function PublicCartProvider({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}

"use client"

import { Heart } from "lucide-react"
import { useWishlist, WishlistItem } from "./wishlist-provider"

interface WishlistButtonProps {
  item: WishlistItem
  variant?: "icon" | "icon-floating"
  className?: string
}

export function WishlistButton({ item, variant = "icon-floating", className = "" }: WishlistButtonProps) {
  const { isInWishlist, toggle } = useWishlist()
  const active = isInWishlist(item.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(item)
  }

  if (variant === "icon-floating") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
        className={`size-9 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow flex items-center justify-center transition-colors hover:bg-white dark:hover:bg-neutral-900 ${className}`}
      >
        <Heart
          className={`size-4 transition-colors ${
            active ? "fill-red-500 text-red-500" : "text-gray-500 dark:text-gray-400"
          }`}
        />
      </button>
    )
  }

  // variant === "icon" (sin fondo, para ponerlo dentro de otros containers)
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`inline-flex items-center justify-center size-9 rounded-full border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors ${className}`}
    >
      <Heart className={`size-4 ${active ? "fill-red-500 text-red-500" : ""}`} />
    </button>
  )
}

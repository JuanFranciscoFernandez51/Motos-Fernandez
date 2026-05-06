"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, Bike, ShoppingBag, Sparkles } from "lucide-react"
import { getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { useCart } from "@/lib/cart-context"

/**
 * Bottom bar sticky para mobile — acciones rápidas siempre accesibles.
 * Solo visible < lg breakpoint.
 */
export function MobileBottomBar() {
  const pathname = usePathname()
  const { totalItems } = useCart()

  // Ocultar en checkout/carrito para no estorbar
  const hideOn = ["/carrito", "/checkout"]
  if (hideOn.some((p) => pathname.startsWith(p))) return null

  const isCatalogo = pathname === "/catalogo" || pathname.startsWith("/catalogo/")
  const isTienda = pathname === "/tienda" || pathname.startsWith("/tienda/")

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30">
      {/* Línea dorada sutil arriba */}
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-[#C9A55C]/40 to-transparent"
      />
      <div className="bg-[#0E0B12]/95 backdrop-blur-lg border-t border-white/5">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          <Link
            href="/catalogo"
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isCatalogo ? "text-[#C9A55C]" : "text-gray-400 hover:text-white"
            }`}
          >
            <Bike className="size-5" />
            <span className="text-[10px] font-semibold">Catálogo</span>
          </Link>

          <Link
            href="/recomendador"
            className="flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-[#C9A55C] transition-colors"
          >
            <Sparkles className="size-5" />
            <span className="text-[10px] font-semibold">Quiz</span>
          </Link>

          <Link
            href="/tienda"
            className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isTienda ? "text-[#C9A55C]" : "text-gray-400 hover:text-white"
            }`}
          >
            <ShoppingBag className="size-5" />
            <span className="text-[10px] font-semibold">Tienda</span>
            {totalItems > 0 && (
              <span className="absolute top-2 right-1/2 translate-x-3 size-4 flex items-center justify-center rounded-full bg-[#C9A55C] text-[9px] font-bold text-[#0E0B12]">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          <a
            href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-0.5 text-[#25D366] hover:text-[#1eb557] transition-colors"
          >
            <MessageCircle className="size-5" />
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  )
}

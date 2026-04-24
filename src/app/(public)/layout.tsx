"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BUSINESS, HORARIOS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { Menu, X, Phone, MapPin, Clock, MessageCircle, ShoppingBag, Heart } from "lucide-react"
import { ThemeToggleSubtle } from "@/components/theme-toggle"
import { Chatbot } from "@/components/public/chatbot"
import { CartProvider, useCart } from "@/lib/cart-context"
import { ComparadorProvider } from "@/components/public/comparador-provider"
import { WishlistProvider, useWishlist } from "@/components/public/wishlist-provider"
import { CookieBanner } from "@/components/public/cookie-banner"
import { NewsletterForm } from "@/components/public/newsletter-form"

const NAV_LINKS = [
  { href: "/catalogo", label: "Catálogo", highlight: true },
  { href: "/tienda", label: "Tienda" },
  { href: "/consigna", label: "Consigna" },
  { href: "/financiacion", label: "Financiación" },
  { href: "/servicio-tecnico", label: "Servicio Técnico" },
  { href: "/noticias", label: "Noticias" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
]

function CartIcon() {
  const { totalItems } = useCart()
  return (
    <Link
      href="/carrito"
      className="relative inline-flex items-center justify-center size-9 rounded-md text-gray-300 hover:text-white hover:bg-white/5 dark:hover:bg-neutral-900/5 transition-colors"
      aria-label="Carrito"
    >
      <ShoppingBag className="size-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-[#9B59B6] text-[10px] font-bold text-white">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </Link>
  )
}

function WishlistIcon() {
  const { count } = useWishlist()
  return (
    <Link
      href="/favoritos"
      className="relative inline-flex items-center justify-center size-9 rounded-md text-gray-300 hover:text-white hover:bg-white/5 dark:hover:bg-neutral-900/5 transition-colors"
      aria-label="Favoritos"
    >
      <Heart className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-[#1A1A1A] border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Logo - monograma */}
          <Link href="/" className="flex-shrink-0 mr-4">
            <Image
              src="/images/monograma-blanco-transparente.svg"
              alt={BUSINESS.name}
              width={40}
              height={40}
              className="h-10 w-10"
              priority
            />
          </Link>

          {/* Desktop nav - centrado */}
          <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                  (link as { highlight?: boolean }).highlight
                    ? "text-[#9B59B6] hover:text-[#B07FCC] hover:bg-white/5 dark:hover:bg-neutral-900/5 font-semibold"
                    : "text-gray-300 hover:text-white hover:bg-white/5 dark:hover:bg-neutral-900/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: cart + mobile hamburger */}
          <div className="flex items-center gap-2 ml-auto lg:ml-4">
            <div className="hidden lg:flex items-center gap-1">
              <ThemeToggleSubtle className="text-gray-300 hover:text-white hover:bg-white/5 dark:hover:bg-neutral-900/5" />
              <WishlistIcon />
              <CartIcon />
            </div>
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/10 dark:hover:bg-neutral-900/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            >
              {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#1A1A1A]">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-3 py-2.5 text-base font-medium transition-colors ${
                  (link as { highlight?: boolean }).highlight
                    ? "text-[#9B59B6] font-semibold"
                    : "text-gray-300 hover:text-white hover:bg-white/5 dark:hover:bg-neutral-900/5"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <ThemeToggleSubtle className="text-gray-300 hover:text-white hover:bg-white/5 dark:hover:bg-neutral-900/5" />
              <WishlistIcon />
              <CartIcon />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo & about */}
          <div className="lg:col-span-1">
            <Image
              src="/images/logo-horizontal-blanco.svg"
              alt={BUSINESS.name}
              width={200}
              height={48}
              className="h-10 w-auto mb-4"
            />
            <p className="text-sm text-gray-400 leading-relaxed">
              {BUSINESS.slogan}. Concesionaria multimarca en {BUSINESS.city} con más de {BUSINESS.yearsInBusiness} años de trayectoria.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navegación
            </h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contacto
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 mt-0.5 text-[#8B6F9A] shrink-0" />
                <span className="text-sm text-gray-400">{BUSINESS.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-[#8B6F9A] shrink-0" />
                <a
                  href={`tel:${BUSINESS.phone}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {BUSINESS.whatsappDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="size-4 text-[#8B6F9A] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                <a
                  href={BUSINESS.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {BUSINESS.instagram}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Horarios
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <Clock className="size-4 mt-0.5 text-[#8B6F9A] shrink-0" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">Lunes a Viernes</p>
                  <p>{HORARIOS.lunesViernes}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="size-4 mt-0.5 text-[#8B6F9A] shrink-0" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">Sábados</p>
                  <p>{HORARIOS.sabados}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="size-4 mt-0.5 text-[#8B6F9A] shrink-0" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">Domingos</p>
                  <p>{HORARIOS.domingos}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Recibí las novedades de {BUSINESS.name}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Enterate primero de promos, nuevos modelos y eventos.
            </p>
            <NewsletterForm origen="footer" />
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} {BUSINESS.name}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/envios" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-300 transition-colors">Envíos</Link>
            <Link href="/privacidad" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-300 transition-colors">Privacidad</Link>
            <Link href="/terminos" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-300 transition-colors">Términos</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function WhatsAppButton() {
  return (
    <a
      href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center justify-center size-14 rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20BD5A] transition-all hover:scale-110"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="size-7" />
    </a>
  )
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CartProvider>
      <ComparadorProvider>
        <WishlistProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
          <Chatbot />
          <CookieBanner />
        </WishlistProvider>
      </ComparadorProvider>
    </CartProvider>
  )
}

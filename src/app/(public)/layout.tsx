"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BUSINESS, HORARIOS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import {
  Menu,
  X,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  ShoppingBag,
  Heart,
  ChevronRight,
  Bike,
  Sparkles,
} from "lucide-react"
import { ThemeToggleSubtle } from "@/components/theme-toggle"
import { Chatbot } from "@/components/public/chatbot"
import { CartProvider, useCart } from "@/lib/cart-context"
import { ComparadorProvider } from "@/components/public/comparador-provider"
import { WishlistProvider, useWishlist } from "@/components/public/wishlist-provider"
import { CookieBanner } from "@/components/public/cookie-banner"
import { NewsletterForm } from "@/components/public/newsletter-form"
import { PromoBar } from "@/components/public/promo-bar"
import { MobileBottomBar } from "@/components/public/mobile-bottom-bar"

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
      className="relative inline-flex items-center justify-center size-9 rounded-md text-gray-300 hover:text-[#C9A55C] hover:bg-white/5 transition-colors"
      aria-label="Carrito"
    >
      <ShoppingBag className="size-5" />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-[#C9A55C] text-[10px] font-bold text-[#0E0B12]">
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
      className="relative inline-flex items-center justify-center size-9 rounded-md text-gray-300 hover:text-[#C9A55C] hover:bg-white/5 transition-colors"
      aria-label="Favoritos"
    >
      <Heart className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-4 rounded-full bg-[#C9A55C] text-[10px] font-bold text-[#0E0B12]">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    handler()
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  // Cerrar mobile menu al navegar
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Bloquear scroll cuando mobile menu está abierto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  return (
    <>
      <nav
        className={`relative transition-all duration-300 ${
          scrolled
            ? "bg-[#0E0B12]/90 backdrop-blur-xl shadow-premium-md border-b border-white/[0.06]"
            : "bg-[#0E0B12] border-b border-white/5"
        }`}
      >
        {/* Línea dorada sutil arriba */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A55C]/40 to-transparent"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 lg:h-[72px] items-center">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 mr-4 group" aria-label="Inicio">
              <Image
                src="/images/monograma-blanco-transparente.svg"
                alt={BUSINESS.name}
                width={40}
                height={40}
                className="h-10 w-10 transition-transform group-hover:scale-110"
                priority
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:gap-0.5">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href + "/"))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative whitespace-nowrap px-3.5 py-2 text-[13px] font-medium transition-colors rounded-md group ${
                      (link as { highlight?: boolean }).highlight
                        ? "text-[#C9A55C] hover:text-[#E2BE6E] font-semibold"
                        : isActive
                          ? "text-white"
                          : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                    {/* Underline elegante */}
                    {(isActive || (link as { highlight?: boolean }).highlight) && (
                      <span
                        className={`absolute inset-x-3 -bottom-0.5 h-px ${
                          (link as { highlight?: boolean }).highlight
                            ? "bg-gradient-to-r from-transparent via-[#C9A55C] to-transparent"
                            : "bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        }`}
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 ml-auto lg:ml-4">
              <div className="hidden lg:flex items-center gap-1">
                <ThemeToggleSubtle className="text-gray-300 hover:text-white hover:bg-white/5" />
                <WishlistIcon />
                <CartIcon />
                <a
                  href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#C9A55C] to-[#E2BE6E] px-4 py-2 text-xs font-bold text-[#0E0B12] hover:shadow-champagne-glow transition-all hover:-translate-y-0.5"
                >
                  <Phone className="size-3.5" />
                  WhatsApp
                </a>
              </div>
              {/* Mobile actions */}
              <div className="lg:hidden flex items-center gap-1">
                <CartIcon />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer - Premium */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Drawer panel */}
        <aside
          className={`absolute right-0 top-0 h-full w-[88%] max-w-sm bg-gradient-to-b from-[#15121A] to-[#0E0B12] shadow-premium-xl border-l border-[#C9A55C]/15 transition-transform duration-300 ease-out flex flex-col ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Línea dorada al borde */}
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#C9A55C]/50 to-transparent"
          />

          {/* Header del drawer */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              onClick={() => setMobileOpen(false)}
            >
              <Image
                src="/images/monograma-blanco-transparente.svg"
                alt={BUSINESS.name}
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span className="font-serif text-lg text-white tracking-wide">
                Motos Fernández
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/5"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-0.5">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href + "/"))
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`group flex items-center justify-between rounded-lg px-4 py-3.5 text-base font-medium transition-all ${
                        (link as { highlight?: boolean }).highlight
                          ? "bg-gradient-to-r from-[#C9A55C]/15 to-transparent text-[#C9A55C] font-semibold border-l-2 border-[#C9A55C]"
                          : isActive
                            ? "bg-white/5 text-white"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        {(link as { highlight?: boolean }).highlight && (
                          <Bike className="size-4" />
                        )}
                        {link.label}
                      </span>
                      <ChevronRight className="size-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Quiz CTA */}
            <Link
              href="/recomendador"
              onClick={() => setMobileOpen(false)}
              className="mt-6 flex items-center gap-3 rounded-xl border border-[#C9A55C]/30 bg-gradient-to-r from-[#C9A55C]/10 to-transparent p-4 hover:border-[#C9A55C]/60 transition-colors"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-[#C9A55C]/20">
                <Sparkles className="size-5 text-[#C9A55C]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">
                  ¿Qué moto te conviene?
                </p>
                <p className="text-xs text-gray-400">Hacé el quiz inteligente</p>
              </div>
              <ChevronRight className="size-4 text-gray-400" />
            </Link>
          </nav>

          {/* Footer del drawer */}
          <div className="border-t border-white/5 p-5 space-y-3">
            <a
              href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-[#C9A55C] to-[#E2BE6E] px-4 py-3 text-sm font-bold text-[#0E0B12] shadow-champagne-glow"
            >
              <MessageCircle className="size-4" />
              Hablar por WhatsApp
            </a>
            <div className="flex items-center justify-around gap-2 pt-2">
              <ThemeToggleSubtle className="text-gray-300 hover:text-white hover:bg-white/5" />
              <WishlistIcon />
              <a
                href={`tel:${BUSINESS.phone}`}
                className="inline-flex items-center justify-center size-9 rounded-md text-gray-300 hover:text-[#C9A55C] hover:bg-white/5 transition-colors"
                aria-label="Llamar"
              >
                <Phone className="size-5" />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0E0B12] text-gray-300">
      {/* Línea dorada arriba */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A55C]/30 to-transparent"
      />
      {/* Glows decorativos */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 size-96 rounded-full bg-[#6B4F7A]/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-32 size-[420px] rounded-full bg-[#C9A55C]/[0.03] blur-3xl pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo & about */}
          <div className="lg:col-span-1">
            <Image
              src="/images/logo-horizontal-blanco.svg"
              alt={BUSINESS.name}
              width={200}
              height={48}
              className="h-10 w-auto mb-5"
            />
            <p className="text-sm text-gray-400 leading-relaxed font-serif italic">
              &ldquo;{BUSINESS.slogan}&rdquo;
            </p>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Concesionaria multimarca en {BUSINESS.city} con más de{" "}
              <span className="text-[#C9A55C] font-semibold">
                {BUSINESS.yearsInBusiness} años
              </span>{" "}
              de trayectoria.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="relative text-xs font-bold text-white uppercase tracking-[0.2em] mb-5 inline-flex items-center gap-2">
              <span className="size-1 bg-[#C9A55C]" />
              Navegación
            </h3>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C9A55C] transition-colors"
                  >
                    <span className="size-1 rounded-full bg-[#C9A55C]/0 group-hover:bg-[#C9A55C] transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="relative text-xs font-bold text-white uppercase tracking-[0.2em] mb-5 inline-flex items-center gap-2">
              <span className="size-1 bg-[#C9A55C]" />
              Contacto
            </h3>
            <ul className="space-y-3.5">
              <li className="flex items-start gap-2.5">
                <MapPin className="size-4 mt-0.5 text-[#C9A55C] shrink-0" />
                <span className="text-sm text-gray-400">{BUSINESS.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-[#C9A55C] shrink-0" />
                <a
                  href={`tel:${BUSINESS.phone}`}
                  className="text-sm text-gray-400 hover:text-[#C9A55C] transition-colors"
                >
                  {BUSINESS.whatsappDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <svg
                  className="size-4 text-[#C9A55C] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                <a
                  href={BUSINESS.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-[#C9A55C] transition-colors"
                >
                  {BUSINESS.instagram}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="relative text-xs font-bold text-white uppercase tracking-[0.2em] mb-5 inline-flex items-center gap-2">
              <span className="size-1 bg-[#C9A55C]" />
              Horarios
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Clock className="size-4 mt-0.5 text-[#C9A55C] shrink-0" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">Lunes a Viernes</p>
                  <p>{HORARIOS.lunesViernes}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="size-4 mt-0.5 text-[#C9A55C] shrink-0" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">Sábados</p>
                  <p>{HORARIOS.sabados}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="size-4 mt-0.5 text-[#C9A55C] shrink-0" />
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300">Domingos</p>
                  <p>{HORARIOS.domingos}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-14 border-t border-white/5 pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="max-w-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-2">
                Sumate a la familia Fernández
              </h3>
              <p className="font-serif text-2xl sm:text-3xl text-white leading-tight">
                Las novedades, en tu casilla.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Promos, lanzamientos y eventos. Sin spam, prometido.
              </p>
            </div>
            <NewsletterForm origen="footer" />
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {BUSINESS.name}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/envios"
              className="text-xs text-gray-500 hover:text-[#C9A55C] transition-colors"
            >
              Envíos
            </Link>
            <Link
              href="/privacidad"
              className="text-xs text-gray-500 hover:text-[#C9A55C] transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-xs text-gray-500 hover:text-[#C9A55C] transition-colors"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FloatingActions() {
  return (
    <>
      {/* WhatsApp flotante - solo desktop (en mobile está en la bottom bar) */}
      <a
        href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden lg:flex group fixed bottom-6 left-6 z-40 items-center justify-center size-14 rounded-full bg-[#25D366] text-white shadow-premium-lg hover:shadow-2xl transition-all hover:scale-110 animate-pulse-glow"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="size-7 group-hover:scale-110 transition-transform" />
        <span className="sr-only">WhatsApp</span>
      </a>
    </>
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
          <div className="sticky top-0 z-40">
            <PromoBar />
            <Navbar />
          </div>
          <main className="flex-1 pb-16 lg:pb-0">{children}</main>
          <Footer />
          <FloatingActions />
          <MobileBottomBar />
          <Chatbot />
          <CookieBanner />
        </WishlistProvider>
      </ComparadorProvider>
    </CartProvider>
  )
}

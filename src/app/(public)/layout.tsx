"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BUSINESS, HORARIOS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { Menu, X, Phone, MapPin, Clock, MessageCircle, ShoppingBag } from "lucide-react"
import { Chatbot } from "@/components/public/chatbot"
import { CartProvider, useCart } from "@/lib/cart-context"

const NAV_LINKS = [
  { href: "/modelos", label: "Catálogo" },
  { href: "/tienda", label: "Tienda" },
  { href: "/financiacion", label: "Financiacion" },
  { href: "/servicio-tecnico", label: "Servicio Tecnico" },
  { href: "/noticias", label: "Noticias" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
]

function CartIcon() {
  const { totalItems } = useCart()
  return (
    <Link
      href="/carrito"
      className="relative inline-flex items-center justify-center size-9 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
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

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-[#1A1A1A] border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo-horizontal-blanco.svg"
              alt={BUSINESS.name}
              width={180}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/modelos"
              className="ml-4 inline-flex items-center justify-center rounded-lg bg-[#6B4F7A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              Ver Catalogo
            </Link>
            <CartIcon />
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
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
                className="block rounded-md px-3 py-2.5 text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/modelos"
              className="mt-2 block rounded-lg bg-[#6B4F7A] px-3 py-2.5 text-center text-base font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Ver Catalogo
            </Link>
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
              width={180}
              height={40}
              className="h-8 w-auto mb-4"
            />
            <p className="text-sm text-gray-400 leading-relaxed">
              {BUSINESS.slogan}. Concesionaria multimarca en {BUSINESS.city} con
              mas de {BUSINESS.yearsInBusiness} anos de trayectoria.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navegacion
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
                  <p className="font-medium text-gray-300">Sabados</p>
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

        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {BUSINESS.name}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/envios" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Envíos</Link>
            <Link href="/privacidad" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacidad</Link>
            <Link href="/terminos" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Términos</Link>
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
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <Chatbot />
    </CartProvider>
  )
}

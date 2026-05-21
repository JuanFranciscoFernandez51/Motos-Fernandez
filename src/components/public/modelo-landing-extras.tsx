"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  MessageCircle,
  Repeat,
  ShieldCheck,
  CreditCard,
  Truck,
  Wrench,
  Zap,
  Award,
  MapPin,
  Calculator,
} from "lucide-react"
import { trackEvent } from "@/lib/meta-events"
import { BUSINESS, getWhatsAppUrl } from "@/lib/constants"

/**
 * Componentes client para el template de página de modelo
 * (`/catalogo/[slug]`) refactorizado como landing de conversión.
 *
 * El page.tsx sigue siendo Server Component — solo los pedazos que
 * disparan eventos de Meta (ViewContent + Contact) o que tienen UI
 * interactiva (sticky mobile) viven acá como islas client.
 */

interface ModeloInfo {
  slug: string
  marca: string
  nombre: string
  precio: number | null
  moneda: string
  categoria: string
  condicion: string
}

type CtaSource =
  | "hero_button"
  | "calculator_button"
  | "permuta_button"
  | "sticky_bottom"
  | "cta_final"

function dispararContact(modelo: ModeloInfo, source: CtaSource) {
  void trackEvent({
    event_name: "Contact",
    custom_data: {
      content_name: `${modelo.marca} ${modelo.nombre}`,
      content_ids: [modelo.slug],
      content_category: modelo.categoria,
      source,
      value: modelo.precio ?? undefined,
      currency: modelo.moneda || "ARS",
    },
  })
}

/**
 * Dispara ViewContent al cargar la página de modelo. Render-less.
 */
export function ModeloViewContentTracker({ modelo }: { modelo: ModeloInfo }) {
  useEffect(() => {
    void trackEvent({
      event_name: "ViewContent",
      custom_data: {
        content_name: `${modelo.marca} ${modelo.nombre}`,
        content_ids: [modelo.slug],
        content_category: modelo.categoria,
        content_type: "product",
        value: modelo.precio ?? undefined,
        currency: modelo.moneda || "ARS",
      },
    })
    // Se trackea una vez al montar — modelo es estable durante la vida del componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/**
 * Botón WhatsApp con tracking onClick. El evento se dispara antes de
 * que el browser abra el link nuevo (target=_blank).
 */
export function WhatsAppCTA({
  href,
  modelo,
  source,
  children,
  className,
}: {
  href: string
  modelo: ModeloInfo
  source: CtaSource
  children: React.ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => dispararContact(modelo, source)}
      className={className}
    >
      {children}
    </a>
  )
}

/**
 * Sección "Por qué comprarla en Motos Fernandez". 6 bullets con icon.
 * Vive en client para que el bloque sea reutilizable y autocontenido,
 * pero no tiene estado — podría ser server, no cambia nada.
 */
export function PorQueComprarla() {
  const items: { icon: React.ElementType; label: string }[] = [
    { icon: Truck, label: "Envío propio a todo el país" },
    {
      icon: CreditCard,
      label: "Financiación propia hasta 12 cuotas + tarjeta hasta 24",
    },
    { icon: Award, label: `+${BUSINESS.yearsInBusiness} años de experiencia` },
    { icon: Wrench, label: "Taller oficial multimarca (post-venta)" },
    { icon: Zap, label: "Entrega inmediata" },
    { icon: Repeat, label: "Plan canje / permuta aceptada" },
  ]
  return (
    <section className="mt-12 rounded-2xl bg-gradient-to-br from-[#F0F0F0] to-white dark:from-neutral-950 dark:to-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 sm:p-8">
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white text-center">
        Por qué comprarla en {BUSINESS.name}
      </h2>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl bg-white dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 p-3.5"
          >
            <div className="flex items-center justify-center size-9 rounded-lg bg-[#6B4F7A]/10 text-[#6B4F7A] shrink-0">
              <Icon className="size-5" />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Bloque "¿Tenés moto para permutar?" — solo se monta cuando el modelo
 * tiene aceptaPermuta=true. WhatsApp con texto pre-cargado.
 */
export function BloquePermuta({ modelo }: { modelo: ModeloInfo }) {
  const titulo = `${modelo.marca} ${modelo.nombre}`
  const mensaje = `Hola! Tengo una moto para permutar por la ${titulo}. Mi nombre es: `
  const href = getWhatsAppUrl(mensaje)
  return (
    <section className="mt-12 rounded-2xl border border-[#6B4F7A]/30 bg-gradient-to-br from-[#6B4F7A]/10 to-transparent p-6 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-xl bg-[#6B4F7A] text-white">
              <Repeat className="size-6" />
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1A1A1A] dark:text-white">
              ¿Tenés moto para permutar?
            </h2>
          </div>
          <p className="mt-3 text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed max-w-xl">
            Sumamos tu moto al anticipo según tasación. Tasación gratis, sin
            compromiso.
          </p>
        </div>
        <WhatsAppCTA
          href={href}
          modelo={modelo}
          source="permuta_button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] px-5 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 lg:justify-self-end"
        >
          <MessageCircle className="size-5" />
          Consultar permuta
        </WhatsAppCTA>
      </div>
    </section>
  )
}

/**
 * Banner de cierre antes de modelos relacionados. WhatsApp + Google Maps.
 */
export function CTAFinal({
  modelo,
  whatsappHref,
}: {
  modelo: ModeloInfo
  whatsappHref: string
}) {
  return (
    <section className="mt-12 rounded-2xl bg-gradient-to-br from-[#15121A] to-[#0E0B12] text-white p-6 sm:p-10 text-center relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 -right-32 size-96 rounded-full bg-[#6B4F7A]/30 blur-3xl pointer-events-none"
      />
      <div className="relative">
        <ShieldCheck className="size-10 mx-auto mb-3 text-[#C8C8D0]" />
        <h2 className="font-heading text-2xl sm:text-3xl font-bold">
          ¿Listo para llevártela?
        </h2>
        <p className="mt-2 text-gray-300 text-sm sm:text-base">
          Te respondemos en menos de 1 hora hábil.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <WhatsAppCTA
            href={whatsappHref}
            modelo={modelo}
            source="cta_final"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
          >
            <MessageCircle className="size-5" />
            Consultar por WhatsApp
          </WhatsAppCTA>
          <a
            href={BUSINESS.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/20 hover:bg-white/5 px-6 py-4 text-base font-semibold text-white transition-colors"
          >
            <MapPin className="size-5" />
            Visitanos en el local
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-400">{BUSINESS.address}</p>
      </div>
    </section>
  )
}

/**
 * Mini-CTA debajo de la calculadora. Copy "Me interesa este plan".
 */
export function CalculadoraCTA({
  modelo,
  whatsappHref,
}: {
  modelo: ModeloInfo
  whatsappHref: string
}) {
  return (
    <div className="mt-3">
      <WhatsAppCTA
        href={whatsappHref}
        modelo={modelo}
        source="calculator_button"
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] px-4 py-3 text-sm font-bold text-white shadow transition-all hover:-translate-y-0.5"
      >
        <Calculator className="size-4" />
        Me interesa este plan, consultar
      </WhatsAppCTA>
    </div>
  )
}

/**
 * Barra fija en la parte inferior, SOLO mobile. Muestra precio compacto
 * + cuota desde + botón WhatsApp gigante. Importante: el `<main>`
 * necesita padding-bottom equivalente a la altura de esta barra para
 * que no tape el último contenido — usamos `pb-24 lg:pb-0` en el
 * contenedor superior.
 */
export function StickyMobileCTA({
  modelo,
  whatsappHref,
  precioEtiqueta,
  cuotaEtiqueta,
}: {
  modelo: ModeloInfo
  whatsappHref: string
  precioEtiqueta: string | null
  cuotaEtiqueta: string | null
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] lg:hidden border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 px-3 py-2.5 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="min-w-0 flex-1">
        {precioEtiqueta && (
          <p className="text-base font-bold text-[#6B4F7A] truncate leading-tight">
            {precioEtiqueta}
          </p>
        )}
        {cuotaEtiqueta && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight">
            {cuotaEtiqueta}
          </p>
        )}
        {!precioEtiqueta && !cuotaEtiqueta && (
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {modelo.marca} {modelo.nombre}
          </p>
        )}
      </div>
      <WhatsAppCTA
        href={whatsappHref}
        modelo={modelo}
        source="sticky_bottom"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] px-4 py-3 text-sm font-bold text-white shadow shrink-0"
      >
        <MessageCircle className="size-4" />
        WhatsApp
      </WhatsAppCTA>
    </div>
  )
}


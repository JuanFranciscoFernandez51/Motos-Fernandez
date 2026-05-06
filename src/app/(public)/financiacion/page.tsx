import Link from "next/link"
import { BUSINESS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import {
  CreditCard,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  ChevronDown,
} from "lucide-react"
import type { Metadata } from "next"
import { SimuladorFinanciacion } from "@/components/public/simulador-financiacion"
import { Watermark } from "@/components/public/ui/watermark"
import { GoldDivider } from "@/components/public/ui/gold-divider"
import { SectionEyebrow } from "@/components/public/ui/section-eyebrow"

export const metadata: Metadata = {
  title: "Financiacion | Planes a medida para tu moto",
  description:
    "Financiamos tu moto, cuatriciclo o UTV con los mejores planes. Entrega inmediata y la cuota mas baja del mercado en Bahia Blanca.",
}

const BENEFICIOS = [
  "Aprobacion rapida",
  "Entrega inmediata",
  "Cuotas accesibles",
  "Sin requisitos complicados",
  "Financiacion propia",
  "Asesoramiento personalizado",
]

const FAQ = [
  {
    q: "Que necesito para financiar una moto?",
    a: "Necesitás DNI, último recibo de sueldo o constancia de monotributo, y un servicio a tu nombre. Si no tenés recibo de sueldo, podés presentar un garante que sí lo tenga. Nuestros asesores te guían en todo el proceso.",
  },
  {
    q: "Puedo financiar usadas?",
    a: "Sí, financiamos tanto motos 0km como usadas. Consultanos por WhatsApp o acercate al local para ver las opciones disponibles según el modelo.",
  },
  {
    q: "Cuanto es la entrega minima?",
    a: "La entrega mínima es del 40% del valor de la unidad.",
  },
  {
    q: "Cuantas cuotas puedo elegir?",
    a: "Con financiación propia ofrecemos hasta 12 cuotas, y con tarjeta de crédito hasta 24 cuotas. Para algunas marcas también hay créditos prendarios disponibles.",
  },
  {
    q: "Trabajan con créditos prendarios?",
    a: "Sí, trabajamos con créditos prendarios para marcas como Aprilia y Vespa, entre otras. Consultanos por el modelo que te interesa y te asesoramos con las opciones de financiación disponibles.",
  },
]

export default function FinanciacionPage() {
  return (
    <>
      <TrackVisita pagina="financiacion" />

      {/* Hero premium */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325] py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C8C8D0]/[0.08] blur-3xl pointer-events-none" />
        <Watermark position="right" size="xl" opacity="subtle" className="hidden md:block" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#C8C8D0]/10 backdrop-blur-sm mb-6 ring-1 ring-[#C8C8D0]/30">
            <CreditCard className="size-8 text-[#C8C8D0]" />
          </div>
          <SectionEyebrow centered variant="gold">
            Hasta 24 cuotas
          </SectionEyebrow>
          <h1 className="mt-5 font-heading text-5xl sm:text-6xl lg:text-7xl text-white text-balance leading-tight">
            Financiamos <span className="text-[#C8C8D0]">tu moto</span>
          </h1>
          <GoldDivider variant="ornament" className="mt-7" />
          <p className="mt-7 text-base sm:text-lg text-gray-300 max-w-xl mx-auto leading-relaxed">
            Planes a medida con entrega inmediata. La cuota más baja del mercado y
            asesoramiento personalizado.
          </p>
          <div className="mt-9">
            <a
              href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-7 py-3.5 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <MessageCircle className="relative size-5" />
              <span className="relative">Consultar por WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Simulador de financiacion */}
      <section className="py-16 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SimuladorFinanciacion />
        </div>
      </section>

      {/* Benefits */}
      <section className="relative py-20 sm:py-24 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#6B4F7A] mb-3">
              Beneficios
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-[#1A1A1A] dark:text-white leading-tight">
              ¿Por qué financiar con nosotros?
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Más de {BUSINESS.yearsInBusiness} años nos respaldan
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFICIOS.map((b) => (
              <div
                key={b}
                className="group flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 hover:border-[#6B4F7A]/30 hover:shadow-premium-md transition-all duration-300"
              >
                <div className="flex items-center justify-center size-11 rounded-xl bg-[#6B4F7A]/10 text-[#6B4F7A] shrink-0 group-hover:bg-[#6B4F7A] group-hover:text-white transition-colors">
                  <CheckCircle className="size-5" />
                </div>
                <span className="text-sm font-bold text-[#1A1A1A] dark:text-white">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-20 sm:py-24 bg-[#F8F5FA] dark:bg-neutral-950 overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#6B4F7A] mb-3">
              Tres pasos simples
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-[#1A1A1A] dark:text-white leading-tight">
              ¿Cómo funciona?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Elegí tu modelo",
                desc: "Navegá nuestro catálogo y elegí la moto que más te gusta.",
              },
              {
                step: "02",
                title: "Consultá el plan",
                desc: "Contactanos por WhatsApp o acercate al local. Te asesoramos sin compromiso.",
              },
              {
                step: "03",
                title: "Retirá tu moto",
                desc: "Con la aprobación confirmada, tu moto está lista para retirar.",
              },
            ].map((item) => (
              <article
                key={item.step}
                className="group relative rounded-2xl bg-white dark:bg-neutral-900 p-8 text-center border border-gray-100 dark:border-neutral-800 hover:border-[#6B4F7A]/30 hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <span className="block font-display text-7xl font-bold text-[#6B4F7A]/10 leading-none mb-2">
                  {item.step}
                </span>
                <h3 className="font-heading text-xl font-bold text-[#1A1A1A] dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 sm:py-24 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center size-12 rounded-xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-4">
              <HelpCircle className="size-6" />
            </div>
            <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#6B4F7A] mb-3">
              Resolvé tus dudas
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-[#1A1A1A] dark:text-white leading-tight">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:border-[#6B4F7A]/30 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-bold text-[#1A1A1A] dark:text-white hover:bg-[#F8F5FA] dark:hover:bg-neutral-900 transition-colors">
                  <span>{item.q}</span>
                  <ChevronDown className="size-4 text-[#6B4F7A] group-open:rotate-180 transition-transform shrink-0 ml-3" />
                </summary>
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-neutral-800 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-[#0E0B12] via-[#15121A] to-[#1A1325] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.06]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <Watermark position="center" size="2xl" opacity="subtle" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#C8C8D0] mb-3">
            Tu próximo paso
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance">
            ¿Listo para financiar tu moto?
          </h2>
          <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Contactanos y te armamos un plan a tu medida. Sin compromiso.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <a
              href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#20BD5A] transition-colors shadow-lg"
            >
              <MessageCircle className="size-5" />
              WhatsApp
            </a>
            <Link
              href="/catalogo"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-7 py-3.5 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <span className="relative">Ver catálogo</span>
              <ArrowRight className="relative size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

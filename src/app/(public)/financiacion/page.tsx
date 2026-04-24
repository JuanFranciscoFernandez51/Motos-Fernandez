export const dynamic = "force-dynamic"

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
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#6B4F7A] to-[#9B59B6] py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <CreditCard className="size-12 text-white/80 mx-auto mb-6" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-heading">
            Financiamos tu moto
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto font-body">
            Planes a medida con entrega inmediata. La cuota mas baja del mercado
            y asesoramiento personalizado.
          </p>
          <div className="mt-8">
            <a
              href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-neutral-900 px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MessageCircle className="size-5" />
              Consultar por WhatsApp
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
      <section className="py-20 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
              Por que financiar con nosotros?
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 font-body">
              Mas de {BUSINESS.yearsInBusiness} anos nos respaldan
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFICIOS.map((b) => (
              <div
                key={b}
                className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 hover:border-[#6B4F7A]/20 transition-colors"
              >
                <CheckCircle className="size-5 text-[#6B4F7A] shrink-0" />
                <span className="text-sm font-medium text-[#1A1A1A] dark:text-white">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[#F0F0F0] dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading text-center mb-12">
            Como funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Elegi tu modelo",
                desc: "Navega nuestro catalogo y elegi la moto que mas te gusta.",
              },
              {
                step: "02",
                title: "Consulta el plan",
                desc: "Contactanos por WhatsApp o acercate al local. Te asesoramos sin compromiso.",
              },
              {
                step: "03",
                title: "Retira tu moto",
                desc: "Con la aprobacion confirmada, tu moto esta lista para retirar.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-xl bg-white dark:bg-neutral-900 p-8 text-center"
              >
                <span className="text-5xl font-extrabold text-[#6B4F7A]/10 font-heading">
                  {item.step}
                </span>
                <h3 className="mt-2 text-lg font-bold text-[#1A1A1A] dark:text-white font-heading">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-body">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <HelpCircle className="size-8 text-[#6B4F7A] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-semibold text-[#1A1A1A] dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                  {item.q}
                  <ChevronDown className="size-4 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-body">
                    {item.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#1A1A1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white font-heading">
            Listo para financiar tu moto?
          </h2>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto font-body">
            Contactanos y te armamos un plan a tu medida. Sin compromiso.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="size-5" />
              WhatsApp
            </a>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              Ver catalogo
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

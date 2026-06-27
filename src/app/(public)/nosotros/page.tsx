import Image from "next/image"
import Link from "next/link"
import { BUSINESS } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import {
  Shield,
  Users,
  Wrench,
  CreditCard,
  Star,
  MapPin,
  ArrowRight,
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nosotros | Nuestra historia y valores",
  description: `Conoce la historia de ${BUSINESS.name}. Mas de ${BUSINESS.yearsInBusiness} anos en ${BUSINESS.city}, brindando confianza y servicio a miles de clientes.`,
}

const VALUES = [
  {
    icon: Shield,
    title: "Confianza",
    desc: "Mas de cuatro decadas de trayectoria nos respaldan. Cada cliente es parte de nuestra familia.",
  },
  {
    icon: Users,
    title: "Atencion personalizada",
    desc: "Te asesoramos de forma honesta para que elijas el vehiculo que realmente necesitas.",
  },
  {
    icon: Wrench,
    title: "Servicio tecnico propio",
    desc: "Taller equipado con herramientas profesionales y personal capacitado por las principales marcas.",
  },
  {
    icon: CreditCard,
    title: "Financiacion accesible",
    desc: "Planes propios y de terceros para que puedas acceder a tu moto con cuotas que se adapten a vos.",
  },
  {
    icon: Star,
    title: "Calidad garantizada",
    desc: "Trabajamos solo con marcas reconocidas y brindamos garantia oficial en todas las unidades.",
  },
  {
    icon: MapPin,
    title: "Raices locales",
    desc: `Somos de ${BUSINESS.city}. Nuestra historia esta ligada al crecimiento de la ciudad y su gente.`,
  },
]

const TIMELINE = [
  {
    year: "1985",
    title: "Los comienzos",
    desc: "Abrimos las puertas en Brown 1052, Bahia Blanca. Una familia, una pasion.",
  },
  {
    year: "1995",
    title: "Crecimiento constante",
    desc: "Nos consolidamos como referentes en la zona, sumando nuevas marcas y ampliando el taller.",
  },
  {
    year: "2005",
    title: "Multimarca",
    desc: "Incorporamos cuatriciclos, UTV y motos de agua, ampliando la oferta para todo tipo de uso.",
  },
  {
    year: "2015",
    title: "Renovacion",
    desc: "Modernizamos el salon y el taller, incorporando tecnologia de diagnostico de ultima generacion.",
  },
  {
    year: "Hoy",
    title: "Referentes en la region",
    desc: `Mas de ${BUSINESS.yearsInBusiness} anos despues, seguimos fieles a nuestros valores: confianza, servicio y pasion.`,
  },
]

export default function NosotrosPage() {
  return (
    <>
      <TrackVisita pagina="nosotros" />

      {/* Hero premium */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325] py-20 sm:py-24">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-[#7C3AED]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-[360px] rounded-full bg-[#C8C8D0]/[0.06] blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#C8C8D0] mb-4">
              Desde {BUSINESS.yearFounded}
            </p>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.05] text-balance">
              Pasión por las motos desde{" "}
              <span className="text-[#C8C8D0]">{BUSINESS.yearFounded}</span>
            </h1>
            <p className="mt-7 text-base sm:text-lg text-gray-300 leading-relaxed ">
              Fundada en {BUSINESS.yearFounded} en el corazón de {BUSINESS.city},{" "}
              {BUSINESS.name} nació con un objetivo claro: acompañar a cada
              cliente en la elección de su vehículo ideal.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative py-20 sm:py-24 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#7C3AED] mb-3">
              Lo que nos define
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-[#1A1A1A] dark:text-white leading-tight">
              Nuestros valores
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
              Los pilares que guían cada decisión
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <article
                key={v.title}
                className="group h-full relative flex flex-col p-7 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#7C3AED]/30 hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-center size-12 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] mb-5 group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                  <v.icon className="size-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#1A1A1A] dark:text-white mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {v.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="relative py-20 sm:py-24 bg-[#F8F5FA] dark:bg-neutral-950 overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#7C3AED] mb-3">
              Nuestra trayectoria
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-[#1A1A1A] dark:text-white leading-tight">
              Nuestra historia
            </h2>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-7 top-0 bottom-0 w-px bg-gradient-to-b from-[#7C3AED]/30 via-[#7C3AED]/20 to-transparent" />

            <div className="space-y-8">
              {TIMELINE.map((item) => (
                <div key={item.year} className="relative flex gap-6 items-start">
                  <div className="relative z-10 flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-[#3D2649] to-[#7C3AED] text-white text-xs font-bold shrink-0 shadow-violeta-soft">
                    {item.year}
                  </div>
                  <div className="pt-2 flex-1 rounded-xl bg-white dark:bg-neutral-900 p-5 shadow-premium-sm">
                    <h3 className="font-heading text-base font-bold text-[#1A1A1A] dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="relative py-20 sm:py-24 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] mb-5">
                <MapPin className="size-6" />
              </div>
              <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#7C3AED] mb-3">
                Visitanos
              </p>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-[#1A1A1A] dark:text-white leading-tight">
                Dónde encontrarnos
              </h2>
              <p className="mt-5 text-gray-500 dark:text-gray-400 leading-relaxed">
                Estamos en {BUSINESS.address}. Visitanos de lunes a viernes
                o los sábados por la mañana.
              </p>
              <div className="mt-7 space-y-2.5 rounded-2xl bg-[#F8F5FA] dark:bg-neutral-950 p-5 border border-gray-100 dark:border-neutral-800">
                <p className="text-sm text-[#1A1A1A] dark:text-white">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-[#7C3AED] block mb-0.5">Dirección</span>
                  {BUSINESS.address}
                </p>
                <p className="text-sm text-[#1A1A1A] dark:text-white">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-[#7C3AED] block mb-0.5">Teléfono</span>
                  {BUSINESS.whatsappDisplay}
                </p>
                <p className="text-sm text-[#1A1A1A] dark:text-white">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-[#7C3AED] block mb-0.5">Email</span>
                  {BUSINESS.email}
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={BUSINESS.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5"
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <MapPin className="relative size-4" />
                  <span className="relative">Ver en Google Maps</span>
                </a>
                <Link
                  href="/contacto"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#7C3AED]/30 bg-white dark:bg-neutral-900 px-6 py-3 text-sm font-bold text-[#7C3AED] hover:bg-[#7C3AED]/5 hover:border-[#7C3AED]/60 transition-colors"
                >
                  Contactanos
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
            <div className="aspect-[4/3] rounded-2xl bg-[#F8F5FA] dark:bg-neutral-950 overflow-hidden shadow-premium-sm border border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="size-12 text-[#7C3AED]/30 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">{BUSINESS.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

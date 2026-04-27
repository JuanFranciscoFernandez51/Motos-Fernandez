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
      {/* Hero */}
      <section className="bg-[#1A1A1A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
              Desde {BUSINESS.yearFounded}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-heading leading-tight">
              Pasion por las motos desde {BUSINESS.yearFounded}
            </h1>
            <p className="mt-5 text-lg text-gray-400 font-body leading-relaxed">
              Fundada en {BUSINESS.yearFounded} en el corazon de {BUSINESS.city},{" "}
              {BUSINESS.name} nacio con un objetivo claro: acompanar a cada
              cliente en la eleccion de su vehiculo ideal.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
              Nuestros valores
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 font-body">
              Los pilares que guian cada decision
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:border-[#6B4F7A]/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-center size-12 rounded-full bg-[#6B4F7A]/10 text-[#6B4F7A] mb-4">
                  <v.icon className="size-5" />
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-body">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-[#F0F0F0] dark:bg-neutral-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading text-center mb-12">
            Nuestra historia
          </h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-[#6B4F7A]/20" />

            <div className="space-y-10">
              {TIMELINE.map((item) => (
                <div key={item.year} className="relative flex gap-6">
                  <div className="relative z-10 flex items-center justify-center size-12 rounded-full bg-[#6B4F7A] text-white text-xs font-bold shrink-0">
                    {item.year}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-body">
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
      <section className="py-20 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <MapPin className="size-8 text-[#6B4F7A] mb-4" />
              <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
                Donde encontrarnos
              </h2>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-body leading-relaxed">
                Estamos en {BUSINESS.address}. Visitanos de lunes a viernes
                o los sabados por la manana.
              </p>
              <div className="mt-6 space-y-2">
                <p className="text-sm text-[#1A1A1A] dark:text-white">
                  <span className="font-semibold">Direccion:</span>{" "}
                  {BUSINESS.address}
                </p>
                <p className="text-sm text-[#1A1A1A] dark:text-white">
                  <span className="font-semibold">Telefono:</span>{" "}
                  {BUSINESS.whatsappDisplay}
                </p>
                <p className="text-sm text-[#1A1A1A] dark:text-white">
                  <span className="font-semibold">Email:</span>{" "}
                  {BUSINESS.email}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={BUSINESS.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
                >
                  <MapPin className="size-4" />
                  Ver en Google Maps
                </a>
                <Link
                  href="/contacto"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 transition-colors"
                >
                  Contactanos
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
            <div className="aspect-[4/3] rounded-xl bg-[#F0F0F0] dark:bg-neutral-950 overflow-hidden">
              {/* Map placeholder */}
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="size-12 text-gray-300 mx-auto mb-2" />
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

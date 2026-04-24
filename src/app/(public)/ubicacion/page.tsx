import type { Metadata } from "next"
import Link from "next/link"
import { BUSINESS, HORARIOS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import { MapPin, Phone, Mail, Clock, MessageCircle, Navigation, Car, Bike } from "lucide-react"

export const metadata: Metadata = {
  title: `Ubicación y cómo llegar | ${BUSINESS.name}`,
  description: `Visitanos en ${BUSINESS.address}. Concesionaria multimarca con más de ${BUSINESS.yearsInBusiness} años en ${BUSINESS.city}. Mirá cómo llegar, horarios y contacto.`,
  openGraph: {
    title: `Ubicación | ${BUSINESS.name}`,
    description: `Estamos en ${BUSINESS.address}. Te esperamos.`,
  },
}

const { lat, lng } = BUSINESS.coordinates

// Embed sin API key (Google Maps clásico)
const mapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=es&z=17&output=embed`

// Link a Google Maps para abrir direcciones
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

// Schema.org structured data para SEO local
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://motos-fernandez.vercel.app/ubicacion",
  name: BUSINESS.name,
  description: BUSINESS.description,
  url: "https://motos-fernandez.vercel.app",
  telephone: BUSINESS.phone,
  email: BUSINESS.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Brown 1052",
    addressLocality: BUSINESS.city,
    addressRegion: BUSINESS.province,
    postalCode: BUSINESS.postalCode,
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: lat,
    longitude: lng,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:30",
      closes: "12:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "15:30",
      closes: "19:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "13:00",
    },
  ],
}

export default function UbicacionPage() {
  return (
    <>
      <TrackVisita pagina="ubicacion" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-[#1A1A1A] py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-[#9B59B6] uppercase tracking-wider font-semibold mb-3">
            <MapPin className="size-4" />
            Ubicación
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
            Visitanos en {BUSINESS.city}
          </h1>
          <p className="mt-3 text-gray-400 font-body max-w-2xl">
            Estamos en <span className="text-white font-medium">{BUSINESS.address}</span>. Más de {BUSINESS.yearsInBusiness} años atendiendo a motociclistas. Te esperamos en el local con todas las marcas y atención personalizada.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              <Navigation className="size-4" />
              Cómo llegar
            </a>
            <a
              href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="size-4" />
              Contactanos
            </a>
          </div>
        </div>
      </section>

      {/* Mapa grande */}
      <section className="bg-[#F0F0F0] dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl overflow-hidden shadow-lg shadow-black/10 border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="500"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Ubicación de ${BUSINESS.name}`}
              className="w-full h-[400px] sm:h-[500px]"
            />
          </div>
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="inline size-3 -mt-0.5" /> {BUSINESS.address}
          </p>
        </div>
      </section>

      {/* Info cards */}
      <section className="bg-white dark:bg-neutral-900 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dirección y contacto */}
            <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-[#F7F7F7] p-6">
              <div className="size-10 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center mb-4">
                <MapPin className="size-5 text-[#6B4F7A]" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-3">
                Dónde estamos
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {BUSINESS.address}
                <br />
                <span className="text-gray-400 text-xs">CP {BUSINESS.postalCode}</span>
              </p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#6B4F7A] hover:underline"
              >
                Abrir en Google Maps
                <Navigation className="size-3" />
              </a>
            </div>

            {/* Horarios */}
            <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-[#F7F7F7] p-6">
              <div className="size-10 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center mb-4">
                <Clock className="size-5 text-[#6B4F7A]" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-3">
                Horarios
              </h2>
              <ul className="space-y-1.5 text-sm">
                <li className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Lun - Vie</span>
                  <span className="font-medium text-[#1A1A1A] dark:text-white">{HORARIOS.lunesViernes}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Sábados</span>
                  <span className="font-medium text-[#1A1A1A] dark:text-white">{HORARIOS.sabados}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Domingos</span>
                  <span className="text-gray-400">{HORARIOS.domingos}</span>
                </li>
              </ul>
            </div>

            {/* Contacto rápido */}
            <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-[#F7F7F7] p-6">
              <div className="size-10 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center mb-4">
                <Phone className="size-5 text-[#6B4F7A]" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-3">
                Contacto
              </h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={`tel:${BUSINESS.phone}`}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#6B4F7A] transition-colors"
                  >
                    <Phone className="size-3.5 shrink-0" />
                    {BUSINESS.whatsappDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${BUSINESS.email}`}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#6B4F7A] transition-colors break-all"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    {BUSINESS.email}
                  </a>
                </li>
                <li>
                  <a
                    href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#25D366] transition-colors"
                  >
                    <MessageCircle className="size-3.5 shrink-0" />
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo llegar */}
      <section className="bg-[#F0F0F0] dark:bg-neutral-950 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-white font-heading">
                Cómo llegar
              </h2>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Estamos en pleno centro de {BUSINESS.city}, sobre calle Brown al 1052. Una de las arterias principales, fácil de ubicar y con estacionamiento en la zona.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="size-9 shrink-0 rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-center">
                    <Car className="size-4 text-[#6B4F7A]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A] dark:text-white">En auto</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Estacionamiento sobre Brown y calles aledañas. A 5 minutos del centro comercial.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="size-9 shrink-0 rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-center">
                    <Bike className="size-4 text-[#6B4F7A]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A] dark:text-white">En moto</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Espacio para estacionar en la puerta del local.
                    </p>
                  </div>
                </div>
              </div>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
              >
                <Navigation className="size-4" />
                Trazar ruta en Google Maps
              </a>
            </div>

            {/* Quick links */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-6">
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-4">
                ¿Querés visitarnos?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
                Pasá por el local sin compromiso o te atendemos antes por WhatsApp para coordinar la visita y dejarte la moto preparada.
              </p>
              <div className="space-y-2.5">
                <Link
                  href="/catalogo"
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-neutral-800 px-4 py-3 text-sm font-semibold text-[#1A1A1A] dark:text-white hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
                >
                  Ver catálogo
                  <span className="text-xs text-gray-400">→</span>
                </Link>
                <Link
                  href="/servicio-tecnico"
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-neutral-800 px-4 py-3 text-sm font-semibold text-[#1A1A1A] dark:text-white hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
                >
                  Pedir turno para servicio
                  <span className="text-xs text-gray-400">→</span>
                </Link>
                <Link
                  href="/contacto"
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-neutral-800 px-4 py-3 text-sm font-semibold text-[#1A1A1A] dark:text-white hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
                >
                  Enviar consulta
                  <span className="text-xs text-gray-400">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

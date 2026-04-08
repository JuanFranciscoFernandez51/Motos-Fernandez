"use client"

import { useState } from "react"
import Link from "next/link"
import { BUSINESS, getWhatsAppUrl } from "@/lib/constants"
import {
  CheckCircle,
  Eye,
  Banknote,
  ArrowRight,
  Bike,
  Star,
  Zap,
  TrendingUp,
  MessageCircle,
} from "lucide-react"

const PASOS = [
  {
    numero: "01",
    icon: Bike,
    titulo: "Traé tu moto",
    descripcion:
      "La tasamos gratis y acordamos juntos el precio de venta. Sin compromisos, sin letra chica.",
  },
  {
    numero: "02",
    icon: Eye,
    titulo: "La exhibimos",
    descripcion:
      "Tu moto queda expuesta en nuestro local de Brown 1052 y en todos nuestros canales digitales: web, Instagram y Marketplace.",
  },
  {
    numero: "03",
    icon: Banknote,
    titulo: "Cobrás",
    descripcion:
      "Cuando se vende, te transferimos el importe acordado. Nosotros nos quedamos solo con nuestra comisión.",
  },
]

const BENEFICIOS = [
  {
    icon: Star,
    titulo: "Sin esfuerzo",
    descripcion:
      "Nosotros nos ocupamos de todo: fotos, publicaciones, atención a compradores y trámites.",
  },
  {
    icon: TrendingUp,
    titulo: "Máxima exposición",
    descripcion:
      "Tu moto llega a miles de compradores activos gracias a nuestra presencia digital y física.",
  },
  {
    icon: CheckCircle,
    titulo: "Precio justo",
    descripcion:
      "Te asesoramos para fijar el precio correcto según el mercado, maximizando tu venta.",
  },
  {
    icon: Zap,
    titulo: "Sin costos fijos",
    descripcion:
      "No pagás nada hasta que tu moto se venda. Si no se vende, no te cobramos nada.",
  },
]

function buildWhatsAppMessage(data: {
  nombre: string
  telefono: string
  marcaModelo: string
  anio: string
  km: string
  precio: string
}) {
  return (
    `Hola! Me interesa dejar mi moto en consigna.\n\n` +
    `👤 Nombre: ${data.nombre}\n` +
    `📱 Teléfono: ${data.telefono}\n` +
    `🏍️ Moto: ${data.marcaModelo}\n` +
    `📅 Año: ${data.anio}\n` +
    `🛣️ Km aproximados: ${data.km}\n` +
    `💰 Precio esperado: $${data.precio}\n\n` +
    `Quedo a disposición para coordinar la visita. Gracias!`
  )
}

export default function ConsignaPage() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    marcaModelo: "",
    anio: "",
    km: "",
    precio: "",
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const msg = buildWhatsAppMessage(form)
    window.open(getWhatsAppUrl(msg), "_blank")
  }

  const whatsappGeneral = getWhatsAppUrl(
    "Hola! Quiero consultar sobre el servicio de consigna de motos."
  )

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative bg-[#1A1A1A] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6B4F7A]/25 via-[#6B4F7A]/8 to-transparent" />
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-5" />
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-[#6B4F7A]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-[400px] rounded-full bg-[#9B59B6]/8 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6B4F7A]/40 bg-[#6B4F7A]/10 px-4 py-1.5 mb-6">
              <Bike className="size-4 text-[#9B59B6]" />
              <span className="text-sm font-semibold text-[#9B59B6] uppercase tracking-wider">
                Consigna de Motos
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] font-heading">
              Vendé tu moto
              <span className="block text-[#9B59B6] mt-1">con nosotros</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-2xl font-body leading-relaxed">
              Dejá tu moto en nuestro local y nosotros nos encargamos de venderla. Vos fijás el
              precio, nosotros ponemos la vidriera. Solo cobramos una comisión cuando se vende.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#formulario"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-8 py-4 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/30"
              >
                Dejar mis datos
                <ArrowRight className="size-4" />
              </a>
              <a
                href={whatsappGeneral}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors"
              >
                <MessageCircle className="size-4" />
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
              Simple y transparente
            </p>
            <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
              ¿Cómo funciona?
            </h2>
            <p className="mt-3 text-gray-500 font-body max-w-lg mx-auto">
              Tres pasos para que tu moto encuentre nuevo dueño sin que tengas que mover un dedo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {PASOS.map((paso, idx) => (
              <div key={idx} className="relative flex flex-col items-center text-center">
                {/* Conector entre pasos */}
                {idx < PASOS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] right-[calc(-50%+3rem)] h-px bg-gradient-to-r from-[#6B4F7A]/40 to-transparent" />
                )}
                <div className="relative flex items-center justify-center size-20 rounded-full bg-[#6B4F7A] text-white mb-5 shadow-lg shadow-[#6B4F7A]/30">
                  <paso.icon className="size-9" />
                  <span className="absolute -top-2 -right-2 flex items-center justify-center size-7 rounded-full bg-[#9B59B6] text-xs font-extrabold text-white border-2 border-white">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] font-heading mb-3">
                  {paso.titulo}
                </h3>
                <p className="text-gray-500 font-body leading-relaxed text-sm">
                  {paso.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENEFICIOS ===== */}
      <section className="py-20 bg-[#F0F0F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
              ¿Por qué dejar tu moto con nosotros?
            </h2>
            <p className="mt-3 text-gray-500 font-body max-w-lg mx-auto">
              Más de {BUSINESS.yearsInBusiness} años vendiendo motos nos dan la experiencia para
              hacer la mejor transacción.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFICIOS.map((b, idx) => (
              <div
                key={idx}
                className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200"
              >
                <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                  <b.icon className="size-7" />
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                  {b.titulo}
                </h3>
                <p className="text-sm text-gray-400 font-body leading-relaxed">{b.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FORMULARIO ===== */}
      <section id="formulario" className="py-20 bg-[#1A1A1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Info lateral */}
            <div>
              <p className="text-[#9B59B6] font-semibold text-sm uppercase tracking-widest mb-4">
                Empezá ahora
              </p>
              <h2 className="text-3xl font-bold text-white font-heading mb-5">
                Dejá los datos de tu moto
              </h2>
              <p className="text-gray-400 font-body leading-relaxed mb-8">
                Completá el formulario y te contactamos para coordinar la tasación gratuita. Sin
                compromisos, sin costos.
              </p>
              <ul className="space-y-4">
                {[
                  "Tasación gratuita y sin compromiso",
                  "Exposición en local + canales digitales",
                  "Pagás comisión solo si se vende",
                  "Coordinamos los horarios con vos",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <CheckCircle className="size-5 text-[#9B59B6] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">¿Preferís hablar directo?</p>
                <a
                  href={whatsappGeneral}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#9B59B6] font-semibold hover:text-[#B07FCC] transition-colors"
                >
                  <MessageCircle className="size-5" />
                  Escribinos al {BUSINESS.whatsappDisplay}
                </a>
              </div>
            </div>

            {/* Formulario */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Tu nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Juan García"
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    required
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="291 555-0000"
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Marca y modelo *
                </label>
                <input
                  type="text"
                  name="marcaModelo"
                  required
                  value={form.marcaModelo}
                  onChange={handleChange}
                  placeholder="Honda CB 250 Twister"
                  className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Año *</label>
                  <input
                    type="number"
                    name="anio"
                    required
                    value={form.anio}
                    onChange={handleChange}
                    placeholder="2020"
                    min="1970"
                    max={new Date().getFullYear()}
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Km aproximados *
                  </label>
                  <input
                    type="text"
                    name="km"
                    required
                    value={form.km}
                    onChange={handleChange}
                    placeholder="15.000"
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Precio esperado *
                  </label>
                  <input
                    type="text"
                    name="precio"
                    required
                    value={form.precio}
                    onChange={handleChange}
                    placeholder="800.000"
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B4F7A] px-6 py-4 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/30 mt-2"
              >
                <MessageCircle className="size-4" />
                Enviar consulta por WhatsApp
              </button>
              <p className="text-xs text-center text-gray-500">
                Al enviar se abrirá WhatsApp con tus datos pre-completados.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative py-20 bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-heading mb-4">
            ¿Querés vender tu moto ya?
          </h2>
          <p className="text-white/80 font-body max-w-xl mx-auto mb-8">
            Traela a nuestro local en {BUSINESS.address} o escribinos por WhatsApp y coordinamos.
            Sin vueltas, sin burocracia.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={whatsappGeneral}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-gray-50 transition-colors shadow-lg"
            >
              <MessageCircle className="size-4" />
              Escribinos al {BUSINESS.whatsappDisplay}
            </a>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Más información
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

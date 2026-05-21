"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  MessageCircle,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Repeat,
  CreditCard,
  Phone,
  Mail,
  Loader2,
} from "lucide-react"
import { BUSINESS, formatPrice, getWhatsAppUrl } from "@/lib/constants"
import { trackEvent } from "@/lib/meta-events"

/**
 * Landing reutilizable para campañas de Meta Ads. La usamos para la
 * Honda XR150 y la Suzuki DR650 (y futuras). Cambia data, no
 * estructura. Estructura del brief de cowork:
 *
 *   Hero → Beneficios → Ficha técnica → Permuta → Form backup
 *
 * Mobile-first, CTA WhatsApp gigante sticky, eventos de Pixel + CAPI
 * disparados con event_id compartido (Meta deduplica).
 */

export interface FichaTecnicaItem {
  label: string
  valor: string
}

export interface LandingMotoAdData {
  slug: string
  marca: string
  modelo: string
  tituloHero: string
  subtituloHero: string
  imagen: string
  imagenAlt: string
  precio: number | null
  cuota: { cantidad: number; monto: number } | null
  fichaTecnica: FichaTecnicaItem[]
  beneficios: string[]
  tonoColor: "honda-xr150" | "suzuki-dr650"
  mensajeWhatsApp: string
  mensajeWhatsAppPermuta: string
}

export function LandingMotoAd({ data }: { data: LandingMotoAdData }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Snapshot de UTMs para mandar con el lead
  const [utms] = useState(() => ({
    utm_source: searchParams?.get("utm_source") || "",
    utm_medium: searchParams?.get("utm_medium") || "",
    utm_campaign: searchParams?.get("utm_campaign") || "",
    utm_content: searchParams?.get("utm_content") || "",
    fbclid: searchParams?.get("fbclid") || "",
  }))

  // Form state
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    permuta: "no" as "si" | "no",
    contactoPref: "whatsapp",
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")

  // ViewContent al cargar (una sola vez)
  useEffect(() => {
    trackEvent({
      event_name: "ViewContent",
      custom_data: {
        content_name: `${data.marca} ${data.modelo}`,
        content_category: "moto",
        content_type: "product",
        content_ids: [data.slug],
        currency: "ARS",
        value: data.precio ?? undefined,
      },
    })
  }, [data.modelo, data.marca, data.slug, data.precio])

  const colorAccent =
    data.tonoColor === "honda-xr150"
      ? "from-red-600 to-orange-500"
      : "from-zinc-800 to-zinc-600"
  const colorBadge =
    data.tonoColor === "honda-xr150"
      ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"

  const waHref = getWhatsAppUrl(data.mensajeWhatsApp)
  const waPermutaHref = getWhatsAppUrl(data.mensajeWhatsAppPermuta)

  const handleWhatsAppClick = (source: string) => {
    trackEvent({
      event_name: "Contact",
      custom_data: {
        content_name: `${data.marca} ${data.modelo}`,
        source,
        channel: "whatsapp",
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.nombre.trim() || (!form.telefono.trim() && !form.email.trim())) {
      setError("Dejanos al menos tu nombre y un contacto (teléfono o email)")
      return
    }
    setEnviando(true)
    try {
      const res = await fetch("/api/lead-meta-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono,
          email: form.email,
          modeloInteres: `${data.marca} ${data.modelo}`,
          permuta: form.permuta,
          contactoPref: form.contactoPref,
          ...utms,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "No pudimos guardar tu consulta")
      }
      // Track Lead (Pixel + CAPI con PII hasheada server-side)
      await trackEvent({
        event_name: "Lead",
        custom_data: {
          content_name: `${data.marca} ${data.modelo}`,
          content_category: "moto",
          currency: "ARS",
          value: data.precio ?? undefined,
        },
        user_data: {
          email: form.email || undefined,
          phone: form.telefono || undefined,
          first_name: form.nombre.split(" ")[0],
        },
      })
      router.push(`/gracias?modelo=${data.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar")
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-950">
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pt-10 sm:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="order-2 lg:order-1">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colorBadge}`}
              >
                <CheckCircle2 className="size-3.5" /> Stock en Bahía Blanca
              </span>
              <h1 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 dark:text-white">
                {data.tituloHero}
              </h1>
              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                {data.subtituloHero}
              </p>

              {(data.precio || data.cuota) && (
                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-end">
                  {data.precio && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                        Precio
                      </p>
                      <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(data.precio)}
                      </p>
                    </div>
                  )}
                  {data.cuota && (
                    <div className="sm:pl-5 sm:border-l sm:border-gray-200 dark:sm:border-neutral-800">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                        O en {data.cuota.cantidad} cuotas
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(data.cuota.monto)}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        sin tarjeta · financiación propia
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleWhatsAppClick("hero_button")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] px-5 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <MessageCircle className="size-5" />
                  Consultar por WhatsApp
                </a>
                <a
                  href="#form-consulta"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 dark:border-neutral-700 hover:border-gray-400 px-5 py-4 text-base font-semibold text-gray-800 dark:text-gray-200 transition-colors"
                >
                  <Mail className="size-5" />
                  Dejar mis datos
                </a>
              </div>
            </div>

            <div className="order-1 lg:order-2 relative">
              <div
                className={`absolute -inset-4 rounded-3xl bg-gradient-to-br ${colorAccent} opacity-20 blur-2xl`}
              />
              <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-neutral-900 shadow-xl">
                <Image
                  src={data.imagen}
                  alt={data.imagenAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="bg-gray-50 dark:bg-neutral-900/40 border-y border-gray-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white">
            ¿Por qué comprarla en {BUSINESS.name}?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            +{BUSINESS.yearsInBusiness} años en Bahía Blanca. La concesionaria
            multimarca de confianza.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.beneficios.map((b, i) => {
              const Icon = [ShieldCheck, CreditCard, Repeat, Wrench, CheckCircle2, Phone][i % 6]
              return (
                <div
                  key={b}
                  className="flex items-start gap-3 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-4 shadow-sm"
                >
                  <div
                    className={`flex items-center justify-center size-10 rounded-lg bg-gradient-to-br ${colorAccent} text-white shrink-0`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug pt-1.5">
                    {b}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FICHA TÉCNICA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Ficha técnica
        </h2>
        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <dl className="divide-y divide-gray-200 dark:divide-neutral-800">
            {data.fichaTecnica.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-2 gap-4 px-5 py-3.5 odd:bg-gray-50/50 dark:odd:bg-neutral-900/40"
              >
                <dt className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {item.label}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {item.valor}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* PERMUTA */}
      <section
        className={`bg-gradient-to-br ${colorAccent} text-white relative overflow-hidden`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <Repeat className="size-10 mb-3 opacity-90" />
              <h2 className="font-heading text-2xl sm:text-3xl font-bold">
                ¿Tenés moto para permutar?
              </h2>
              <p className="mt-3 text-white/90 text-base leading-relaxed max-w-xl">
                La tomamos como parte de pago, te hacemos cotización gratis y
                vos sólo te preocupás por elegir el color. Trámite de
                transferencia incluido.
              </p>
            </div>
            <a
              href={waPermutaHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleWhatsAppClick("permuta_button")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 px-5 py-4 text-base font-bold shadow-lg transition-all hover:-translate-y-0.5 lg:justify-self-end"
            >
              <MessageCircle className="size-5" />
              Consultar permuta
            </a>
          </div>
        </div>
      </section>

      {/* FORM BACKUP */}
      <section
        id="form-consulta"
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
      >
        <div className="text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Dejanos tus datos y te escribimos
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Si no querés usar WhatsApp, completá el form y te respondemos en
            menos de 1 hora hábil.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre *
            </label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/40"
              placeholder="Tu nombre"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Teléfono / WhatsApp
              </label>
              <input
                inputMode="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/40"
                placeholder="291 578-8671"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/40"
                placeholder="vos@ejemplo.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                ¿Tenés moto para permutar?
              </label>
              <select
                value={form.permuta}
                onChange={(e) =>
                  setForm({ ...form, permuta: e.target.value as "si" | "no" })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/40"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                ¿Cómo te contactamos?
              </label>
              <select
                value={form.contactoPref}
                onChange={(e) =>
                  setForm({ ...form, contactoPref: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-4 py-3 text-base text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/40"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="llamada">Llamada</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] hover:from-[#4A2D58] hover:to-[#7C5C8C] disabled:opacity-60 px-5 py-4 text-base font-bold text-white shadow-lg transition-all"
          >
            {enviando ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Enviando…
              </>
            ) : (
              <>Enviar consulta</>
            )}
          </button>
          <p className="text-[11px] text-center text-gray-500 dark:text-gray-400">
            Al enviar aceptás que te contactemos por el medio elegido para
            responder esta consulta.
          </p>
        </form>
      </section>
    </div>
  )
}

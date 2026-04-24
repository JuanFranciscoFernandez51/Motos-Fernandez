"use client"

import { useState } from "react"
import { BUSINESS, HORARIOS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import {
  Send,
  MapPin,
  Phone,
  Mail,
  Clock,

  MessageCircle,
  CheckCircle,
  Loader2,
} from "lucide-react"

export default function ContactoPage() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setStatus("success")
        setForm({ nombre: "", email: "", telefono: "", mensaje: "" })
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  return (
    <>
      <TrackVisita pagina="contacto" />
      {/* Hero */}
      <section className="bg-[#1A1A1A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
            Contacto
          </h1>
          <p className="mt-3 text-gray-400 font-body max-w-xl">
            Estamos para ayudarte. Completa el formulario o contactanos
            directamente por WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold text-[#1A1A1A] dark:text-white font-heading mb-6">
                Envianos un mensaje
              </h2>

              {status === "success" ? (
                <div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/30 p-8 text-center">
                  <CheckCircle className="size-10 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-300">
                    Mensaje enviado
                  </h3>
                  <p className="mt-2 text-sm text-green-600 dark:text-green-300">
                    Recibimos tu consulta. Te responderemos a la brevedad.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-4 text-sm font-semibold text-green-700 dark:text-green-300 hover:underline"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="nombre"
                      className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5"
                    >
                      Nombre completo *
                    </label>
                    <input
                      id="nombre"
                      type="text"
                      required
                      value={form.nombre}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nombre: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2.5 px-4 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5"
                      >
                        Email *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, email: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2.5 px-4 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="telefono"
                        className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5"
                      >
                        Telefono
                      </label>
                      <input
                        id="telefono"
                        type="tel"
                        value={form.telefono}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, telefono: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2.5 px-4 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                        placeholder="291 000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="mensaje"
                      className="block text-sm font-medium text-[#1A1A1A] dark:text-white mb-1.5"
                    >
                      Mensaje *
                    </label>
                    <textarea
                      id="mensaje"
                      required
                      rows={5}
                      value={form.mensaje}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, mensaje: e.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2.5 px-4 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 resize-none"
                      placeholder="Contanos tu consulta..."
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-sm text-red-600">
                      Hubo un error al enviar. Intenta de nuevo o contactanos
                      por WhatsApp.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-7 py-3 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        Enviar mensaje
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A] dark:text-white font-heading mb-6">
                  Informacion de contacto
                </h2>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="size-5 text-[#6B4F7A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-white">
                        Direccion
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{BUSINESS.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="size-5 text-[#6B4F7A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-white">
                        Telefono
                      </p>
                      <a
                        href={`tel:${BUSINESS.phone}`}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#6B4F7A] transition-colors"
                      >
                        {BUSINESS.whatsappDisplay}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="size-5 text-[#6B4F7A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-white">Email</p>
                      <a
                        href={`mailto:${BUSINESS.email}`}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#6B4F7A] transition-colors"
                      >
                        {BUSINESS.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="size-5 text-[#6B4F7A] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A] dark:text-white">
                        Instagram
                      </p>
                      <a
                        href={BUSINESS.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#6B4F7A] transition-colors"
                      >
                        {BUSINESS.instagram}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-[#F0F0F0] dark:bg-neutral-950 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="size-5 text-[#6B4F7A]" />
                  <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white">Horarios</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Lunes a Viernes</span>
                    <span className="font-medium text-[#1A1A1A] dark:text-white">
                      {HORARIOS.lunesViernes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Sabados</span>
                    <span className="font-medium text-[#1A1A1A] dark:text-white">
                      {HORARIOS.sabados}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Domingos</span>
                    <span className="font-medium text-[#1A1A1A] dark:text-white">
                      {HORARIOS.domingos}
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <a
                href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-[#25D366] p-5 text-white hover:bg-[#20BD5A] transition-colors"
              >
                <MessageCircle className="size-8 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Escribinos por WhatsApp</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Respuesta inmediata en horario comercial
                  </p>
                </div>
              </a>

              {/* Map */}
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-800">
                <iframe
                  src={`https://maps.google.com/maps?q=${BUSINESS.coordinates.lat},${BUSINESS.coordinates.lng}&hl=es&z=17&output=embed`}
                  width="100%"
                  height="240"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Ubicación de ${BUSINESS.name}`}
                  className="w-full block"
                />
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{BUSINESS.address}</p>
                  <a
                    href="/ubicacion"
                    className="text-xs font-semibold text-[#6B4F7A] hover:underline shrink-0"
                  >
                    Ver más →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

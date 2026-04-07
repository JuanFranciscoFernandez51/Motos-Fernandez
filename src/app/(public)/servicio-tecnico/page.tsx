"use client"

import { useState } from "react"
import {
  BUSINESS,
  SERVICIOS_TALLER,
  getWhatsAppUrl,
  WHATSAPP_MESSAGES,
} from "@/lib/constants"
import {
  Wrench,
  MessageCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Shield,
  Clock,
  Star,
} from "lucide-react"

export default function ServicioTecnicoPage() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    modeloMoto: "",
    tipoServicio: "",
    fechaPreferida: "",
    comentarios: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const res = await fetch("/api/public/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setStatus("success")
        setForm({
          nombre: "",
          telefono: "",
          email: "",
          modeloMoto: "",
          tipoServicio: "",
          fechaPreferida: "",
          comentarios: "",
        })
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  const update = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }))

  return (
    <>
      {/* Hero */}
      <section className="bg-[#1A1A1A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Wrench className="size-10 text-[#8B6F9A] mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white font-heading">
              Servicio Tecnico
            </h1>
            <p className="mt-3 text-gray-400 font-body max-w-xl">
              Taller propio con mecanicos especializados. Saca turno online y
              dejamos tu moto como nueva.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: Shield,
                title: "Personal capacitado",
                desc: "Mecanicos formados por las principales marcas",
              },
              {
                icon: Wrench,
                title: "Herramientas profesionales",
                desc: "Equipamiento de ultima generacion",
              },
              {
                icon: Clock,
                title: "Turnos rapidos",
                desc: "Coordinamos segun tu disponibilidad",
              },
              {
                icon: Star,
                title: "Garantia",
                desc: "Todos los trabajos con garantia",
              },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="flex items-center justify-center size-12 rounded-full bg-[#6B4F7A]/10 text-[#6B4F7A] mx-auto mb-3">
                  <f.icon className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1A1A] font-heading">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500 font-body">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold text-[#1A1A1A] font-heading mb-1">
                Saca turno online
              </h2>
              <p className="text-sm text-gray-500 font-body mb-6">
                Completa el formulario y te contactamos para confirmar.
              </p>

              {status === "success" ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
                  <CheckCircle className="size-10 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-green-800">
                    Turno solicitado
                  </h3>
                  <p className="mt-2 text-sm text-green-600">
                    Recibimos tu solicitud. Te contactaremos por WhatsApp para
                    confirmar dia y horario.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-4 text-sm font-semibold text-green-700 hover:underline"
                  >
                    Solicitar otro turno
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="nombre"
                        className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                      >
                        Nombre completo *
                      </label>
                      <input
                        id="nombre"
                        type="text"
                        required
                        value={form.nombre}
                        onChange={(e) => update("nombre", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="telefono"
                        className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                      >
                        Telefono *
                      </label>
                      <input
                        id="telefono"
                        type="tel"
                        required
                        value={form.telefono}
                        onChange={(e) => update("telefono", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                        placeholder="291 000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="modeloMoto"
                      className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                    >
                      Modelo de moto *
                    </label>
                    <input
                      id="modeloMoto"
                      type="text"
                      required
                      value={form.modeloMoto}
                      onChange={(e) => update("modeloMoto", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                      placeholder="Ej: Honda CB 250 Twister 2024"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tipoServicio"
                      className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                    >
                      Tipo de servicio *
                    </label>
                    <select
                      id="tipoServicio"
                      required
                      value={form.tipoServicio}
                      onChange={(e) => update("tipoServicio", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                    >
                      <option value="">Selecciona un servicio</option>
                      {SERVICIOS_TALLER.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="fechaPreferida"
                      className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                    >
                      Fecha preferida
                    </label>
                    <input
                      id="fechaPreferida"
                      type="date"
                      value={form.fechaPreferida}
                      onChange={(e) => update("fechaPreferida", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="comentarios"
                      className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                    >
                      Comentarios
                    </label>
                    <textarea
                      id="comentarios"
                      rows={4}
                      value={form.comentarios}
                      onChange={(e) => update("comentarios", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20 resize-none"
                      placeholder="Detalles adicionales sobre el trabajo que necesitas..."
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-sm text-red-600">
                      Hubo un error. Intenta de nuevo o contactanos por WhatsApp.
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
                        <Calendar className="size-4" />
                        Solicitar turno
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Services list */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-[#1A1A1A] font-heading mb-6">
                Servicios disponibles
              </h2>
              <div className="space-y-3">
                {SERVICIOS_TALLER.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-4 hover:border-[#6B4F7A]/20 transition-colors"
                  >
                    <Wrench className="size-4 text-[#6B4F7A] shrink-0" />
                    <span className="text-sm text-[#1A1A1A]">{s}</span>
                  </div>
                ))}
              </div>

              {/* WhatsApp CTA */}
              <a
                href={getWhatsAppUrl(WHATSAPP_MESSAGES.turno)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center gap-3 rounded-xl bg-[#25D366] p-5 text-white hover:bg-[#20BD5A] transition-colors"
              >
                <MessageCircle className="size-8 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Consultar por WhatsApp</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Respuesta inmediata en horario comercial
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

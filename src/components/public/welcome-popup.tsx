"use client"

import { useEffect, useState } from "react"
import { X, Gift, Loader2, CheckCircle2, Sparkles } from "lucide-react"

const STORAGE_KEY = "mf-welcome-popup-v1"
const DELAY_MS = 8000 // 8 segundos

type Estado = "form" | "loading" | "success" | "error"

export function WelcomePopup() {
  const [open, setOpen] = useState(false)
  const [estado, setEstado] = useState<Estado>("form")
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
  })

  // Mostrar el popup después de DELAY_MS, solo si no fue mostrado antes
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const ya = localStorage.getItem(STORAGE_KEY)
      if (ya) return // Ya lo vio (o lo cerró, o lo completó)
    } catch {
      // localStorage podría estar deshabilitado
    }

    const timer = setTimeout(() => {
      setOpen(true)
    }, DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // Bloquear scroll cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const cerrar = () => {
    setOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, "closed")
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.nombre.trim()) return setError("Ingresá tu nombre")
    if (!form.telefono.trim()) return setError("Ingresá tu teléfono")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError("Email inválido")
    }

    setEstado("loading")
    try {
      const res = await fetch("/api/public/bienvenida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setEstado("error")
        setError(data?.error || "Error al enviar")
        return
      }
      // Éxito: marcar como completado y mostrar success
      try {
        localStorage.setItem(STORAGE_KEY, "completed")
      } catch {
        // ignore
      }
      setEstado("success")
    } catch {
      setEstado("error")
      setError("Error de conexión")
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={cerrar}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E0B12] via-[#15121A] to-[#1A1325] shadow-premium-xl border border-[#7C3AED]/30">
          {/* Glows decorativos */}
          <div className="absolute -top-20 -right-20 size-48 rounded-full bg-[#7C3AED]/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-[#9B59B6]/20 blur-3xl pointer-events-none" />

          {/* Línea plata arriba */}
          <div
            aria-hidden
            className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C8C8D0]/40 to-transparent"
          />

          {/* Botón cerrar */}
          <button
            onClick={cerrar}
            disabled={estado === "loading"}
            className="absolute top-3 right-3 z-10 size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>

          <div className="relative px-6 sm:px-8 py-8 sm:py-10">
            {estado === "success" ? (
              // ============ ÉXITO ============
              <div className="text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-500/20 mb-5 ring-1 ring-emerald-500/40">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-2">
                  ¡Listo, {form.nombre.split(" ")[0]}!
                </h2>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
                  Te enviamos tu cupón al email{" "}
                  <span className="text-[#C8C8D0] font-semibold">{form.email}</span>.
                  Revisá tu bandeja (y la carpeta de spam) en los próximos minutos.
                </p>
                <div className="rounded-xl bg-[#C8C8D0]/10 border border-[#C8C8D0]/30 p-4 mb-6">
                  <p className="text-xs uppercase tracking-widest text-[#C8C8D0] font-bold mb-1">
                    Tu código de descuento
                  </p>
                  <p className="font-mono text-2xl font-bold text-white tracking-widest">
                    BIENVENIDA10
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    10% OFF en tienda y servicios
                  </p>
                </div>
                <button
                  onClick={cerrar}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3D2649] to-[#7C3AED] px-6 py-3 text-sm font-bold text-white hover:shadow-violeta-glow transition-all hover:-translate-y-0.5"
                >
                  ¡Empezar a comprar!
                </button>
              </div>
            ) : (
              // ============ FORMULARIO ============
              <>
                {/* Header con icono */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-[#3D2649] to-[#7C3AED] mb-4 shadow-violeta-glow">
                    <Gift className="size-7 text-white" />
                  </div>
                  <p className="font-bold text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#C8C8D0] mb-2">
                    <Sparkles className="inline size-3 mr-1 -mt-0.5" />
                    Bienvenida exclusiva
                  </p>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight">
                    10% OFF para vos
                  </h2>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                    En <span className="text-white font-semibold">tienda online</span> y{" "}
                    <span className="text-white font-semibold">servicios de taller</span>.
                    Te lo mandamos por email.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-md bg-red-950/40 p-3 text-xs text-red-300 border border-red-900/40">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={form.nombre}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nombre: e.target.value }))
                      }
                      placeholder="Tu nombre"
                      disabled={estado === "loading"}
                      className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-gray-500 focus:border-[#C8C8D0]/50 focus:outline-none focus:ring-2 focus:ring-[#C8C8D0]/20 transition-colors"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, telefono: e.target.value }))
                      }
                      placeholder="Teléfono (ej: 291 123-4567)"
                      disabled={estado === "loading"}
                      className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-gray-500 focus:border-[#C8C8D0]/50 focus:outline-none focus:ring-2 focus:ring-[#C8C8D0]/20 transition-colors"
                      autoComplete="tel"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="Tu email"
                      disabled={estado === "loading"}
                      className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-gray-500 focus:border-[#C8C8D0]/50 focus:outline-none focus:ring-2 focus:ring-[#C8C8D0]/20 transition-colors"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={estado === "loading"}
                    className="group relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#7C3AED] px-6 py-3.5 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 mt-4"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    />
                    {estado === "loading" ? (
                      <>
                        <Loader2 className="relative size-4 animate-spin" />
                        <span className="relative">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Gift className="relative size-4" />
                        <span className="relative">Recibir mi 10% OFF</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-gray-500 text-center mt-2 leading-relaxed">
                    Al enviar aceptás recibir promos por email. Podés desuscribirte cuando
                    quieras.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

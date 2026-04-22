import Link from "next/link"
import type { Metadata } from "next"
import {
  Compass,
  Home,
  Bike,
  MessageCircle,
  Sparkles,
  Wrench,
  ShoppingBag,
  ArrowRight,
} from "lucide-react"

export const metadata: Metadata = {
  title: "404 - Página no encontrada | Motos Fernandez",
  description:
    "La página que buscás no existe o fue movida. Volvé al inicio o explorá nuestro catálogo de motos 0KM y usadas.",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1A1A1A] text-white">
      {/* Fondo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div
          className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle, #6B4F7A 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle, #9B7BA8 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16">
        {/* Logo / marca */}
        <div className="mb-8 flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-white/60">
          <Bike className="h-4 w-4" style={{ color: "#9B7BA8" }} />
          <span>Motos Fernandez</span>
        </div>

        {/* Número 404 gigante con gradiente */}
        <div className="relative">
          <h1
            className="select-none text-center text-[9rem] font-black leading-none tracking-tighter sm:text-[12rem] md:text-[16rem]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #9B7BA8 0%, #6B4F7A 50%, #4A3655 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(107, 79, 122, 0.4))",
            }}
          >
            404
          </h1>
          {/* Ícono brújula superpuesto */}
          <div className="absolute -right-4 top-4 hidden animate-pulse sm:block md:right-0 md:top-10">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 md:h-20 md:w-20"
              style={{
                borderColor: "#6B4F7A",
                backgroundColor: "rgba(107, 79, 122, 0.15)",
              }}
            >
              <Compass
                className="h-8 w-8 md:h-10 md:w-10"
                style={{ color: "#9B7BA8" }}
              />
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="mt-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Te salió el GPS, che
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            La página que buscás no existe o fue movida. Agarrá el manubrio
            de nuevo y volvé al catálogo, o contactanos por WhatsApp y te
            guiamos nosotros.
          </p>
        </div>

        {/* Botones CTA */}
        <div className="mt-10 flex w-full max-w-2xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl sm:text-base"
            style={{
              backgroundColor: "#6B4F7A",
              boxShadow: "0 10px 30px -10px rgba(107, 79, 122, 0.6)",
            }}
          >
            <Home className="h-4 w-4" />
            Volver al inicio
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 px-6 py-3 text-sm font-semibold transition-all hover:bg-white/5 sm:text-base"
            style={{ borderColor: "#9B7BA8", color: "#C9AFD4" }}
          >
            <Bike className="h-4 w-4" />
            Ver catálogo
          </Link>
          <Link
            href="/contacto"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition-all hover:border-white/40 hover:bg-white/5 sm:text-base"
          >
            <MessageCircle className="h-4 w-4" />
            Contactanos
          </Link>
        </div>

        {/* Separador */}
        <div className="mt-14 flex w-full max-w-md items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-widest text-white/40">
            O quizás te interesa
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Sugerencias de páginas populares */}
        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/catalogo"
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(107, 79, 122, 0.2)" }}
            >
              <Sparkles className="h-5 w-5" style={{ color: "#C9AFD4" }} />
            </div>
            <span className="text-sm font-medium text-white/90">
              Motos 0KM
            </span>
          </Link>

          <Link
            href="/catalogo"
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(107, 79, 122, 0.2)" }}
            >
              <Bike className="h-5 w-5" style={{ color: "#C9AFD4" }} />
            </div>
            <span className="text-sm font-medium text-white/90">
              Motos usadas
            </span>
          </Link>

          <Link
            href="/tienda"
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(107, 79, 122, 0.2)" }}
            >
              <ShoppingBag
                className="h-5 w-5"
                style={{ color: "#C9AFD4" }}
              />
            </div>
            <span className="text-sm font-medium text-white/90">
              Tienda de accesorios
            </span>
          </Link>

          <Link
            href="/servicio-tecnico"
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(107, 79, 122, 0.2)" }}
            >
              <Wrench className="h-5 w-5" style={{ color: "#C9AFD4" }} />
            </div>
            <span className="text-sm font-medium text-white/90">
              Servicio técnico
            </span>
          </Link>
        </div>

        {/* Nota al pie */}
        <p className="mt-12 text-center text-xs text-white/40">
          Si creés que esto es un error, avisanos y lo arreglamos al toque.
        </p>
      </div>
    </main>
  )
}

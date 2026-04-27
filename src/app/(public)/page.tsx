import Link from "next/link"
import Image from "next/image"
import { BUSINESS, formatPrice } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import {
  getModelosDestacados,
  getNoticiasRecientes,
  getTestimoniosHome,
} from "@/lib/cached-queries"
import {
  Bike,
  ArrowRight,
  CreditCard,
  Wrench,
  Package,
  Star,
  Calendar,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react"

// ==================== PAGE ====================

export default async function HomePage() {
  const [modelos, noticias, testimonios] = await Promise.all([
    getModelosDestacados(),
    getNoticiasRecientes(),
    getTestimoniosHome(),
  ])

  return (
    <>
      <TrackVisita pagina="home" />
      {/* ===== 1. HERO ===== */}
      <section className="relative bg-[#1A1A1A] overflow-hidden">
        {/* Layered backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6B4F7A]/25 via-[#6B4F7A]/5 to-transparent" />
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.06]" />
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-[#6B4F7A]/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-[420px] rounded-full bg-[#9B59B6]/10 blur-3xl" />

        {/* Monograma gigante de fondo (decorativo) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 sm:right-0 top-1/2 -translate-y-1/2 opacity-[0.07] hidden md:block"
        >
          <Image
            src="/images/monograma-blanco-transparente.svg"
            alt=""
            width={620}
            height={620}
            className="size-[480px] lg:size-[620px]"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9B59B6]/30 bg-[#9B59B6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#C39BD3]">
              <span className="size-1.5 rounded-full bg-[#9B59B6] animate-pulse" />
              Concesionaria multimarca · {BUSINESS.city}
            </div>

            {/* Headline display */}
            <h1 className="mt-5 font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-[0.01em] text-white">
              TU PRÓXIMA <span className="text-[#9B59B6]">AVENTURA</span><br />
              EMPIEZA ACÁ
            </h1>

            <p className="mt-6 text-base sm:text-lg text-gray-300 max-w-xl font-body leading-relaxed">
              Más de {BUSINESS.yearsInBusiness} años eligiendo con vos la moto, cuatri o UTV ideal.
              Las mejores marcas, financiación propia y taller oficial.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-7 py-4 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-all shadow-lg shadow-[#6B4F7A]/40 hover:shadow-xl hover:shadow-[#6B4F7A]/50 hover:-translate-y-0.5"
              >
                Ver catálogo
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/recomendador"
                className="group inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors backdrop-blur-sm"
              >
                <Sparkles className="size-4 text-[#C39BD3]" />
                Quiz: ¿qué moto te conviene?
              </Link>
              <Link
                href="/servicio-tecnico"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-transparent px-7 py-4 text-sm font-semibold text-white/80 hover:text-white hover:border-white/30 transition-colors"
              >
                <Calendar className="size-4" />
                Pedir turno
              </Link>
            </div>

            {/* Stats row con tipografía display */}
            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-6">
              <div>
                <p className="font-display text-5xl text-white leading-none">+{BUSINESS.yearsInBusiness}</p>
                <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-[0.18em] font-semibold">Años</p>
              </div>
              <div className="w-px bg-white/10 self-stretch" />
              <div>
                <p className="font-display text-5xl text-white leading-none">+50</p>
                <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-[0.18em] font-semibold">Marcas</p>
              </div>
              <div className="w-px bg-white/10 self-stretch" />
              <div>
                <p className="font-display text-5xl text-white leading-none">24</p>
                <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-[0.18em] font-semibold">Cuotas</p>
              </div>
              <div className="w-px bg-white/10 self-stretch" />
              <div>
                <p className="font-display text-5xl text-white leading-none">#1</p>
                <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-[0.18em] font-semibold">{BUSINESS.city}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges abajo */}
        <div className="relative border-t border-white/5 bg-black/30 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-[#C39BD3] shrink-0" />
                <span>Empresa familiar desde {BUSINESS.yearFounded}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-4 text-[#C39BD3] shrink-0" />
                <span>Financiación propia y prendaria</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Wrench className="size-4 text-[#C39BD3] shrink-0" />
                <span>Taller oficial multimarca</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Package className="size-4 text-[#C39BD3] shrink-0" />
                <span>Stock permanente · entrega inmediata</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="size-4 text-[#C39BD3] shrink-0" />
                <span>Envío propio a todo el país</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ===== 3. MODELOS DESTACADOS ===== */}
      <section className="py-14 bg-[#F0F0F0] dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
                Modelos destacados
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-body">
                Los más elegidos por nuestros clientes
              </p>
            </div>
            <Link
              href="/catalogo"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
            >
              Ver todos
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {modelos.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {modelos.map((model) => (
                  <Link
                    key={model.id}
                    href={`/catalogo/${model.slug}`}
                    className="group rounded-xl bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all duration-200"
                  >
                    <div className="relative aspect-square bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                      {model.fotos[0] ? (
                        <Image
                          src={model.fotos[0]}
                          alt={model.nombre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-200">
                          <Bike className="size-10" />
                        </div>
                      )}
                      {model.destacado && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-[#6B4F7A] px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          <Star className="size-2.5 fill-current" />
                          Destacado
                        </div>
                      )}
                      <span className={`absolute top-2 right-2 rounded-md px-2 py-0.5 text-[10px] font-bold shadow ${
                        (model.condicion || "0KM") === "0KM"
                          ? "bg-emerald-500 text-white"
                          : "bg-orange-500 text-white"
                      }`}>
                        {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-[#8B6F9A] uppercase tracking-wider truncate">
                        {model.marca}
                      </p>
                      <h3 className="mt-0.5 text-sm font-bold text-[#1A1A1A] dark:text-white font-heading truncate">
                        {model.nombre}
                      </h3>
                      <p className="text-[10px] text-gray-400 truncate">
                        {(model.condicion || "0KM") === "USADA" ? (
                          <>
                            {model.anio && <span>{model.anio}</span>}
                            {model.kilometros != null && (
                              <span>{model.anio ? " · " : ""}{model.kilometros.toLocaleString("es-AR")} km</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span>{model.anio || new Date().getFullYear()}</span>
                            <span> · 0 km</span>
                          </>
                        )}
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#6B4F7A]">
                        {model.precio
                          ? (model.moneda || "ARS") === "USD"
                            ? `USD ${model.precio.toLocaleString("es-AR")}`
                            : formatPrice(model.precio)
                          : "Consultar"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-10 text-center sm:hidden">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
                >
                  Ver todos los modelos
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
              <Bike className="size-12 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-body">
                Próximamente cargamos nuestro catálogo de modelos.
              </p>
              <Link
                href="/contacto"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
              >
                Consultános directamente
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ===== QUIZ RECOMENDADOR CTA ===== */}
      <section className="relative py-16 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6B4F7A] via-[#7B5A8A] to-[#9B59B6] p-8 sm:p-12 shadow-xl">
            <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
            <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10 dark:bg-neutral-900/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-white/5 dark:bg-neutral-900/5 blur-3xl" />

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center lg:text-left max-w-2xl">
                <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-white/15 dark:bg-neutral-900/15 backdrop-blur-sm mb-5">
                  <Sparkles className="size-7 text-white" />
                </div>
                <p className="text-white/70 font-semibold text-xs uppercase tracking-widest mb-2">
                  Quiz interactivo con IA
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white font-heading leading-tight">
                  ¿No sabés qué moto te conviene?
                </h2>
                <p className="mt-4 text-base sm:text-lg text-white/85 font-body leading-relaxed">
                  Hacé el quiz interactivo y te recomendamos{" "}
                  <span className="font-semibold text-white">3 motos ideales</span>{" "}
                  para vos, según tu uso, experiencia y presupuesto.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href="/recomendador"
                  className="group inline-flex items-center gap-3 rounded-2xl bg-white dark:bg-neutral-900 px-8 py-4 text-base font-bold text-[#6B4F7A] hover:bg-gray-50 dark:hover:bg-neutral-900 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Hacer quiz
                  <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIOS ===== */}
      {testimonios.length > 0 && (
        <section className="py-20 bg-white dark:bg-neutral-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
                Testimonios
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-white font-heading">
                Lo que dicen nuestros clientes
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 font-body max-w-lg mx-auto">
                Historias reales de quienes ya eligieron {BUSINESS.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonios.map((t) => {
                const contenido =
                  t.contenido.length > 150
                    ? t.contenido.slice(0, 150).trimEnd() + "..."
                    : t.contenido
                return (
                  <div
                    key={t.id}
                    className="group flex flex-col rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-lg hover:shadow-[#6B4F7A]/5 hover:border-[#6B4F7A]/20 transition-all duration-200"
                  >
                    {/* Estrellas */}
                    <div className="flex items-center gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < t.rating
                              ? "size-4 fill-yellow-400 text-yellow-400"
                              : "size-4 text-gray-200"
                          }
                        />
                      ))}
                    </div>

                    {/* Contenido */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-body leading-relaxed flex-1">
                      &ldquo;{contenido}&rdquo;
                    </p>

                    {/* Cliente */}
                    <div className="mt-5 flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-neutral-800">
                      {t.foto ? (
                        <Image
                          src={t.foto}
                          alt={t.nombre}
                          width={44}
                          height={44}
                          className="size-11 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-11 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center text-[#6B4F7A] font-bold text-sm shrink-0">
                          {t.nombre
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1A1A1A] dark:text-white font-heading truncate">
                          {t.nombre}
                        </p>
                        {t.ubicacion && (
                          <p className="text-xs text-gray-400 truncate">
                            {t.ubicacion}
                          </p>
                        )}
                      </div>
                      {t.modelo && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-[#6B4F7A]/10 px-2.5 py-1 text-[10px] font-semibold text-[#6B4F7A] uppercase tracking-wide">
                          {t.modelo}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== 4. FINANCIACION PREVIEW ===== */}
      <section className="relative py-20 bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/5 dark:bg-neutral-900/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-white/15 dark:bg-neutral-900/15 mb-6">
                <CreditCard className="size-7 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-heading">
                Financiamos tu moto
              </h2>
              <p className="mt-4 text-lg text-white/80 font-body leading-relaxed">
                Planes de financiación a medida. Financiación propia, con banco o
                tarjeta. Entregá lo mínimo y lleváte tu vehículo hoy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <Link
                href="/financiacion"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-neutral-900 px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors shadow-lg"
              >
                Ver planes de financiación
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 dark:bg-neutral-900/10 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20 dark:hover:bg-neutral-900/20 transition-colors"
              >
                Hablar con un asesor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. CONSIGNA DE MOTOS ===== */}
      <section className="py-20 bg-[#F8F5FA] dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Texto */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
                Servicio exclusivo
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-white font-heading mb-5">
                ¿Querés vender tu moto?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-body leading-relaxed max-w-lg mx-auto lg:mx-0">
                Dejala en nuestro local y nosotros nos encargamos de todo. La exhibimos, la
                publicamos en todos nuestros canales y te avisamos cuando se vende. Vos fijás el
                precio, nosotros ponemos la vidriera y cobramos solo una comisión al cerrar.
              </p>
              <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  href="/consigna"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/20"
                >
                  Conocer más
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href={`https://wa.me/5492915788671?text=${encodeURIComponent("Hola! Quiero consultar sobre el servicio de consigna de motos.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#6B4F7A]/30 bg-white dark:bg-neutral-900 px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 hover:border-[#6B4F7A]/60 transition-colors"
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>

            {/* Cards de beneficios mini -->*/}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { icon: "🏍️", titulo: "Tasación gratis", desc: "Sin compromiso" },
                { icon: "📱", titulo: "Máxima exposición", desc: "Web + redes + local" },
                { icon: "💰", titulo: "Precio justo", desc: "Vos lo fijás" },
                { icon: "✅", titulo: "Sin costos fijos", desc: "Comisión solo al vender" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#6B4F7A]/15 bg-white dark:bg-neutral-900 p-5 hover:border-[#6B4F7A]/35 hover:shadow-md transition-all duration-200"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white font-heading">{item.titulo}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. POR QUE ELEGIRNOS ===== */}
      <section className="py-20 bg-white dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
              Desde {BUSINESS.yearFounded}
            </p>
            <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
              ¿Por qué elegirnos?
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 font-body max-w-lg mx-auto">
              Más de {BUSINESS.yearsInBusiness} años de experiencia nos respaldan. Somos
              una empresa familiar con raíces en {BUSINESS.city}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card 1 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <ShieldCheck className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-2">
                {BUSINESS.yearsInBusiness} años de experiencia
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Desde {BUSINESS.yearFounded} ayudamos a miles de clientes a encontrar su
                vehículo ideal con asesoramiento personalizado.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <CreditCard className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-2">
                Financiación propia
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Planes flexibles sin necesidad de banco. Financiación propia, tarjeta o
                acuerdo con entidades financieras.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <Wrench className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-2">
                Servicio técnico
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Taller oficial con técnicos especializados. Service, reparaciones y
                repuestos originales para todas las marcas.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <Package className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-2">
                Stock permanente
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Más de 50 marcas disponibles. Amplio stock de motos, cuatriciclos, UTVs
                y motos de agua para entrega inmediata.
              </p>
            </div>

            {/* Card 5 - Envío propio */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <Truck className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-white font-heading mb-2">
                Envío propio a todo el país
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Logística directa, sin intermediarios. Despachamos accesorios,
                repuestos y motos desde Bahía Blanca a cualquier punto del país.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. NOTICIAS RECIENTES ===== */}
      <section className="py-20 bg-[#F0F0F0] dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-white font-heading">
                Noticias recientes
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400 font-body">
                Novedades, lanzamientos y consejos del mundo moto
              </p>
            </div>
            <Link
              href="/noticias"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
            >
              Ver todas
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {noticias.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {noticias.map((noticia) => (
                  <Link
                    key={noticia.id}
                    href={`/noticias/${noticia.slug}`}
                    className="group rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-xl hover:shadow-black/8 transition-all duration-200"
                  >
                    <div className="relative aspect-video bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                      {noticia.imagen ? (
                        <Image
                          src={noticia.imagen}
                          alt={noticia.titulo}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#6B4F7A]/10 to-[#9B59B6]/10">
                          <span className="text-[#6B4F7A]/30 font-heading font-bold text-2xl">MF</span>
                        </div>
                      )}
                      {noticia.categoria && (
                        <div className="absolute top-3 left-3 rounded-full bg-[#6B4F7A] px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wide">
                          {noticia.categoria}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-gray-400 mb-2">
                        {new Date(noticia.fechaPublicacion).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <h3 className="font-bold text-[#1A1A1A] dark:text-white font-heading leading-snug line-clamp-2 group-hover:text-[#6B4F7A] transition-colors">
                        {noticia.titulo}
                      </h3>
                      {noticia.resumen && (
                        <p className="mt-2 text-sm text-gray-400 font-body line-clamp-2 leading-relaxed">
                          {noticia.resumen}
                        </p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#6B4F7A] group-hover:gap-2 transition-all">
                        Leer más <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-8 text-center sm:hidden">
                <Link
                  href="/noticias"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
                >
                  Ver todas las noticias
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
              <p className="text-gray-400 font-body">
                Próximamente publicamos nuestras primeras noticias.
              </p>
              <Link
                href="/noticias"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
              >
                Ir a noticias <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ===== CONTACT CTA ===== */}
      <section className="py-20 bg-[#1A1A1A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white font-heading">
            ¿Listo para dar el siguiente paso?
          </h2>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto font-body">
            Visitanos en {BUSINESS.address} o contactanos por WhatsApp. Estamos para ayudarte.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/30"
            >
              Contactanos
            </Link>
            <Link
              href="/servicio-tecnico"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 dark:bg-neutral-900/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 dark:hover:bg-neutral-900/10 transition-colors"
            >
              <Calendar className="size-4" />
              Sacar turno
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

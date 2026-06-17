import Link from "next/link"
import Image from "next/image"
import { BUSINESS, formatPrice } from "@/lib/constants"
import { TrackVisita } from "@/components/public/track-visita"
import {
  getModelosHome,
  getNoticiasRecientes,
  getTestimoniosHome,
} from "@/lib/cached-queries"
import { ModelosHomeGrid } from "@/components/public/modelos-home-grid"
import { MundialHero } from "@/components/public/mundial-hero"
import { AnimatedSection } from "@/components/public/ui/animated-section"
import { MarqueeBrands } from "@/components/public/ui/marquee-brands"
import { Watermark } from "@/components/public/ui/watermark"
import { FloatingLogo } from "@/components/public/ui/floating-logo"
import { GoldDivider } from "@/components/public/ui/gold-divider"
import { SectionEyebrow } from "@/components/public/ui/section-eyebrow"
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
  Quote,
  TrendingUp,
  Banknote,
  CheckCircle2,
} from "lucide-react"

// ==================== PAGE ====================

export default async function HomePage() {
  const [modelosHome, noticias, testimonios] = await Promise.all([
    getModelosHome(),
    getNoticiasRecientes(),
    getTestimoniosHome(),
  ])
  const { destacadas, rotativas } = modelosHome
  // Para chequeos de empty state
  const totalModelos = destacadas.length + rotativas.length

  return (
    <>
      <TrackVisita pagina="home" />

      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E0B12] via-[#15121A] to-[#1A1325]">
        {/* Layered backgrounds */}
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />

        {/* Glows decorativos */}
        <div className="absolute -top-48 -right-48 size-[700px] rounded-full bg-[#6B4F7A]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 size-[420px] rounded-full bg-[#9B59B6]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 size-[300px] rounded-full bg-[#C8C8D0]/[0.06] blur-3xl pointer-events-none" />

        {/* Logo clásico flotante con animación premium */}
        <FloatingLogo position="right" size="2xl" opacity="soft" className="hidden md:block" />

        {/* Línea dorada decorativa */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[#C8C8D0]/40 to-transparent"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="max-w-4xl">
            {/* Eyebrow premium */}
            <AnimatedSection animation="fade" delay={100}>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#C8C8D0]/30 bg-[#C8C8D0]/[0.08] px-4 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-[#C8C8D0] backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-[#C8C8D0] animate-pulse" />
                Concesionaria multimarca · {BUSINESS.city}
                <span className="size-1.5 rounded-full bg-[#C8C8D0]/50" />
                Desde {BUSINESS.yearFounded}
              </div>
            </AnimatedSection>

            {/* Headline display sobrio y moderno */}
            <AnimatedSection animation="fade-up" delay={200}>
              <h1 className="mt-5 text-white text-balance">
                <span className="block font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.9] tracking-tight">
                  TU PRÓXIMA
                </span>
                <span className="block font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl mt-1 leading-[0.9] tracking-tight text-[#C8C8D0]">
                  AVENTURA
                </span>
                <span className="block font-heading text-xl sm:text-2xl lg:text-3xl mt-3 font-light text-gray-300">
                  empieza acá.
                </span>
              </h1>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={400}>
              <p className="mt-6 text-base sm:text-lg text-gray-300/90 max-w-2xl leading-relaxed">
                Más de{" "}
                <span className="text-[#C8C8D0] font-semibold">
                  {BUSINESS.yearsInBusiness} años
                </span>{" "}
                eligiendo con vos la moto, cuatri o UTV ideal. Las mejores marcas,
                financiación propia y taller oficial.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={550}>
              <div className="mt-7 flex flex-wrap gap-3">
                {/* CTA principal — dorado premium */}
                <Link
                  href="/catalogo"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-7 sm:px-8 py-4 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5"
                >
                  {/* Shine effect on hover */}
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    aria-hidden
                  />
                  <span className="relative">Ver catálogo</span>
                  <ArrowRight className="relative size-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/recomendador"
                  className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 text-sm font-semibold text-white hover:bg-white/[0.08] hover:border-white/30 transition-all backdrop-blur-sm"
                >
                  <Sparkles className="size-4 text-[#C8C8D0]" />
                  Quiz: ¿qué moto te conviene?
                </Link>

                <Link
                  href="/servicio-tecnico"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-transparent px-7 py-4 text-sm font-semibold text-white/70 hover:text-white hover:border-white/30 transition-colors"
                >
                  <Calendar className="size-4" />
                  Pedir turno
                </Link>
              </div>
            </AnimatedSection>

            {/* Stats con tipografía premium */}
            <AnimatedSection animation="fade-up" delay={700}>
              <div className="mt-9 flex flex-wrap gap-x-10 sm:gap-x-14 gap-y-6">
                <div>
                  <p className="font-heading text-4xl sm:text-5xl text-white leading-none">
                    +{BUSINESS.yearsInBusiness}
                  </p>
                  <p className="text-[10px] text-[#C8C8D0] mt-2 uppercase tracking-[0.22em] font-bold">
                    Años
                  </p>
                </div>
                <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent self-stretch" />
                <div>
                  <p className="font-heading text-4xl sm:text-5xl text-white leading-none">
                    +50
                  </p>
                  <p className="text-[10px] text-[#C8C8D0] mt-2 uppercase tracking-[0.22em] font-bold">
                    Marcas
                  </p>
                </div>
                <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent self-stretch" />
                <div>
                  <p className="font-heading text-4xl sm:text-5xl text-white leading-none">
                    24
                  </p>
                  <p className="text-[10px] text-[#C8C8D0] mt-2 uppercase tracking-[0.22em] font-bold">
                    Cuotas
                  </p>
                </div>
                <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent self-stretch" />
                <div>
                  <p className="font-heading text-4xl sm:text-5xl text-white leading-none">
                    #1
                  </p>
                  <p className="text-[10px] text-[#C8C8D0] mt-2 uppercase tracking-[0.22em] font-bold">
                    {BUSINESS.city}
                  </p>
                </div>
              </div>
            </AnimatedSection>

            {/* Piezas Modo Mundial (solo si está activo) */}
            <MundialHero />
          </div>
        </div>

        {/* Trust badges abajo - glass premium */}
        <div className="relative border-t border-white/[0.06] bg-[#0A0810]/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-md bg-[#C8C8D0]/10 text-[#C8C8D0] shrink-0">
                  <CreditCard className="size-3.5" />
                </span>
                <span>Financiación propia</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-md bg-[#C8C8D0]/10 text-[#C8C8D0] shrink-0">
                  <Wrench className="size-3.5" />
                </span>
                <span>Taller oficial multimarca</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-md bg-[#C8C8D0]/10 text-[#C8C8D0] shrink-0">
                  <Package className="size-3.5" />
                </span>
                <span>Stock · entrega inmediata</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-md bg-[#C8C8D0]/10 text-[#C8C8D0] shrink-0">
                  <Truck className="size-3.5" />
                </span>
                <span>Envío propio a todo el país</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MARQUEE DE MARCAS ==================== */}
      <MarqueeBrands speed="normal" />

      {/* ==================== MODELOS DESTACADOS ==================== */}
      <section className="relative py-20 sm:py-24 bg-[#F8F5FA] dark:bg-neutral-950 overflow-hidden">
        {/* Watermark */}
        <Watermark position="bottom-right" size="lg" opacity="subtle" className="hidden lg:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up">
            <div className="text-center mb-14">
              <SectionEyebrow centered>Catálogo destacado</SectionEyebrow>
              <h2 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl text-[#1A1A1A] dark:text-white text-balance leading-tight">
                Modelos que <span className="text-[#6B4F7A]">enamoran</span>
              </h2>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                Una selección curada de los modelos más elegidos por nuestros clientes.
              </p>
              <GoldDivider variant="ornament" className="mt-8" />
            </div>
          </AnimatedSection>

          {totalModelos > 0 ? (
            <>
              <ModelosHomeGrid
                destacadas={destacadas.map((m) => ({
                  id: m.id,
                  slug: m.slug,
                  nombre: m.nombre,
                  marca: m.marca,
                  anio: m.anio,
                  kilometros: m.kilometros,
                  condicion: m.condicion || "0KM",
                  precio: m.precio,
                  moneda: m.moneda,
                  fotos: m.fotos,
                  destacado: m.destacado,
                  tipoTenencia: m.tipoTenencia,
                }))}
                rotativas={rotativas.map((m) => ({
                  id: m.id,
                  slug: m.slug,
                  nombre: m.nombre,
                  marca: m.marca,
                  anio: m.anio,
                  kilometros: m.kilometros,
                  condicion: m.condicion || "0KM",
                  precio: m.precio,
                  moneda: m.moneda,
                  fotos: m.fotos,
                  destacado: m.destacado,
                  tipoTenencia: m.tipoTenencia,
                }))}
              />

              <AnimatedSection animation="fade-up">
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/0km"
                    className="group inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#8B6F9A] transition-all shadow-premium-sm hover:shadow-premium-md"
                  >
                    Ver catálogo 0KM
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/disponibles"
                    className="group inline-flex items-center gap-2 rounded-xl border border-[#6B4F7A]/30 bg-white dark:bg-neutral-900 px-7 py-3.5 text-sm font-bold text-[#6B4F7A] hover:bg-[#6B4F7A] hover:text-white hover:border-[#6B4F7A] transition-all shadow-premium-sm hover:shadow-premium-md"
                  >
                    Ver usadas / disponibles
                    <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </AnimatedSection>
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
              <Bike className="size-12 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400">
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

      {/* ==================== QUIZ RECOMENDADOR CTA ==================== */}
      <section className="relative py-20 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="scale">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4A3556] via-[#6B4F7A] to-[#8B6F9A] p-8 sm:p-12 lg:p-16 shadow-premium-xl">
              {/* Patterns and glows */}
              <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.08]" />
              <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
              <div className="absolute -top-16 -right-16 size-64 rounded-full bg-[#C8C8D0]/15 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-white/5 blur-3xl" />

              {/* Marca de agua */}
              <Watermark position="bottom-right" size="xl" opacity="subtle" />

              {/* Línea dorada */}
              <div
                aria-hidden
                className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-[#C8C8D0]/60 to-transparent"
              />

              <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center lg:text-left max-w-2xl">
                  <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#C8C8D0]/15 backdrop-blur-sm mb-6 ring-1 ring-[#C8C8D0]/30">
                    <Sparkles className="size-8 text-[#C8C8D0]" />
                  </div>
                  <SectionEyebrow variant="gold" className="mb-4">
                    Quiz interactivo con IA
                  </SectionEyebrow>
                  <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white leading-tight text-balance">
                    ¿No sabés qué <span className="text-[#C8C8D0]">moto</span> te conviene?
                  </h2>
                  <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
                    Hacé el quiz interactivo y te recomendamos{" "}
                    <span className="font-semibold text-[#C8C8D0]">3 motos ideales</span>{" "}
                    según tu uso, experiencia y presupuesto.
                  </p>
                </div>

                <div className="shrink-0">
                  <Link
                    href="/recomendador"
                    className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-8 py-4 text-base font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:scale-105"
                  >
                    Hacer quiz
                    <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ==================== TESTIMONIOS ==================== */}
      {testimonios.length > 0 && (
        <section className="relative py-20 sm:py-24 bg-gradient-to-b from-white to-[#F8F5FA] dark:from-neutral-900 dark:to-neutral-950 overflow-hidden">
          <Watermark position="left" size="xl" opacity="subtle" className="hidden lg:block" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <AnimatedSection animation="fade-up">
              <div className="text-center mb-14">
                <SectionEyebrow centered>Testimonios reales</SectionEyebrow>
                <h2 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl text-[#1A1A1A] dark:text-white text-balance leading-tight">
                  Lo que dicen <span className="text-[#6B4F7A]">nuestros clientes</span>
                </h2>
                <GoldDivider variant="ornament" className="mt-8" />
              </div>
            </AnimatedSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonios.map((t, idx) => {
                const contenido =
                  t.contenido.length > 180
                    ? t.contenido.slice(0, 180).trimEnd() + "..."
                    : t.contenido
                return (
                  <AnimatedSection
                    key={t.id}
                    animation="fade-up"
                    delay={idx * 100}
                  >
                    <article className="group relative h-full flex flex-col rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-7 shadow-premium-sm hover:shadow-premium-lg hover:border-[#C8C8D0]/30 transition-all duration-300 overflow-hidden">
                      {/* Quote decoration */}
                      <Quote
                        className="absolute -top-1 -right-1 size-20 text-[#C8C8D0]/[0.06] group-hover:text-[#C8C8D0]/[0.10] transition-colors"
                        aria-hidden
                      />

                      {/* Estrellas */}
                      <div className="relative flex items-center gap-0.5 mb-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < t.rating
                                ? "size-4 fill-[#C9A55C] text-[#C8C8D0]"
                                : "size-4 text-gray-200 dark:text-neutral-700"
                            }
                          />
                        ))}
                      </div>

                      {/* Contenido */}
                      <p className="relative text-[15px] text-gray-700 dark:text-gray-200 leading-relaxed flex-1 font-heading">
                        &ldquo;{contenido}&rdquo;
                      </p>

                      {/* Cliente */}
                      <div className="relative mt-6 flex items-center gap-3 pt-5 border-t border-gray-100 dark:border-neutral-800">
                        {t.foto ? (
                          <Image
                            src={t.foto}
                            alt={t.nombre}
                            width={48}
                            height={48}
                            className="size-12 rounded-full object-cover shrink-0 ring-2 ring-[#C8C8D0]/20"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-gradient-to-br from-[#6B4F7A] to-[#8B6F9A] flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-[#C8C8D0]/20">
                            {t.nombre
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#1A1A1A] dark:text-white truncate">
                            {t.nombre}
                          </p>
                          {t.ubicacion && (
                            <p className="text-xs text-gray-400 truncate">
                              {t.ubicacion}
                            </p>
                          )}
                        </div>
                        {t.modelo && (
                          <span className="shrink-0 inline-flex items-center rounded-full border border-[#C8C8D0]/30 bg-[#C8C8D0]/5 px-2.5 py-1 text-[10px] font-bold text-[#C8C8D0] uppercase tracking-wide">
                            {t.modelo}
                          </span>
                        )}
                      </div>
                    </article>
                  </AnimatedSection>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== FINANCIACION PREVIEW ==================== */}
      <section className="relative py-20 sm:py-24 overflow-hidden bg-gradient-to-br from-[#0E0B12] via-[#1A1325] to-[#2A1E3A]">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-[#C8C8D0]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-[#6B4F7A]/20 blur-3xl" />

        <Watermark position="right" size="2xl" opacity="subtle" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="text-center lg:text-left max-w-xl">
                <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#C8C8D0]/10 backdrop-blur-sm mb-6 ring-1 ring-[#C8C8D0]/30">
                  <CreditCard className="size-8 text-[#C8C8D0]" />
                </div>
                <SectionEyebrow variant="gold">Financiación a tu medida</SectionEyebrow>
                <h2 className="mt-4 font-heading text-4xl sm:text-5xl lg:text-6xl text-white leading-tight text-balance">
                  Financiamos <span className="text-[#C8C8D0]">tu moto</span>
                </h2>
                <p className="mt-5 text-base sm:text-lg text-white/80 leading-relaxed">
                  Planes a medida. Financiación propia, con banco o tarjeta. Entregá lo
                  mínimo y lleváte tu vehículo hoy.
                </p>
                <GoldDivider variant="thin" className="my-6 max-w-xs mx-auto lg:mx-0" />
                <p className="text-sm text-white/60">
                  Hasta 24 cuotas con planes adaptados a tu presupuesto.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <Link
                  href="/financiacion"
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-7 py-4 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />
                  <span className="relative">Ver planes</span>
                  <ArrowRight className="relative size-4" />
                </Link>
                <Link
                  href="/contacto"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] backdrop-blur-sm px-7 py-4 text-sm font-semibold text-white hover:bg-white/[0.10] hover:border-white/40 transition-colors"
                >
                  Hablar con asesor
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ==================== CONSIGNA ==================== */}
      <section className="relative py-20 sm:py-24 bg-[#F8F5FA] dark:bg-neutral-900 overflow-hidden">
        <Watermark position="bottom-left" size="lg" opacity="subtle" className="hidden lg:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <AnimatedSection animation="slide-right" className="flex-1 text-center lg:text-left">
              <SectionEyebrow>Servicio exclusivo</SectionEyebrow>
              <h2 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl text-[#1A1A1A] dark:text-white leading-tight text-balance">
                ¿Querés vender <span className="text-[#6B4F7A]">tu moto</span>?
              </h2>
              <p className="mt-5 text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg mx-auto lg:mx-0 text-base sm:text-lg">
                Dejala en nuestro local y nosotros nos encargamos de todo. La exhibimos,
                la publicamos en todos nuestros canales y te avisamos cuando se vende.
              </p>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 font-heading max-w-lg mx-auto lg:mx-0">
                Vos fijás el precio. Nosotros ponemos la vidriera. Cobramos solo al cerrar.
              </p>
              <GoldDivider variant="thin" className="my-7 max-w-xs mx-auto lg:mx-0" />
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link
                  href="/consigna"
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#8B6F9A] transition-colors shadow-violeta-glow hover:shadow-2xl"
                >
                  Conocer más
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href={`https://wa.me/5492915788671?text=${encodeURIComponent("Hola! Quiero consultar sobre el servicio de consigna de motos.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#6B4F7A]/30 bg-white dark:bg-neutral-900 px-7 py-3.5 text-sm font-bold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 hover:border-[#6B4F7A]/60 transition-colors"
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="slide-left" className="flex-1 grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { Icon: Bike, titulo: "Tasación gratis", desc: "Sin compromiso" },
                { Icon: TrendingUp, titulo: "Máxima exposición", desc: "Web + redes + local" },
                { Icon: Banknote, titulo: "Precio justo", desc: "Vos lo fijás" },
                { Icon: CheckCircle2, titulo: "Sin costos fijos", desc: "Comisión al vender" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 hover:border-[#6B4F7A]/30 hover:shadow-premium-md transition-all duration-300"
                >
                  <div className="flex items-center justify-center size-11 rounded-xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-3 group-hover:bg-[#6B4F7A] group-hover:text-white transition-colors">
                    <item.Icon className="size-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    {item.titulo}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ==================== POR QUE ELEGIRNOS ==================== */}
      <section className="relative py-20 sm:py-24 bg-white dark:bg-neutral-900 overflow-hidden">
        <Watermark position="top-right" size="lg" opacity="subtle" className="hidden lg:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up">
            <div className="text-center mb-16">
              <SectionEyebrow centered>Desde {BUSINESS.yearFounded}</SectionEyebrow>
              <h2 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl text-[#1A1A1A] dark:text-white text-balance leading-tight">
                ¿Por qué <span className="text-[#6B4F7A]">elegirnos</span>?
              </h2>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                Más de {BUSINESS.yearsInBusiness} años de experiencia nos respaldan, con
                raíces en {BUSINESS.city}.
              </p>
              <GoldDivider variant="ornament" className="mt-8" />
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: `${BUSINESS.yearsInBusiness} años de experiencia`,
                desc: `Desde ${BUSINESS.yearFounded} ayudamos a miles de clientes a encontrar su vehículo ideal con asesoramiento personalizado.`,
              },
              {
                icon: CreditCard,
                title: "Financiación propia",
                desc: "Planes flexibles sin necesidad de banco. Financiación propia, tarjeta o acuerdo con entidades financieras.",
              },
              {
                icon: Wrench,
                title: "Servicio técnico",
                desc: "Taller oficial con técnicos especializados. Service, reparaciones y repuestos originales para todas las marcas.",
              },
              {
                icon: Package,
                title: "Stock permanente",
                desc: "Más de 50 marcas disponibles. Amplio stock de motos, cuatriciclos, UTVs y motos de agua para entrega inmediata.",
              },
              {
                icon: Truck,
                title: "Envío a todo el país",
                desc: "Logística directa, sin intermediarios. Despachamos accesorios, repuestos y motos desde Bahía Blanca a cualquier punto del país.",
              },
            ].map((card, idx) => (
              <AnimatedSection key={idx} animation="fade-up" delay={idx * 100}>
                <article className="group h-full relative flex flex-col items-center text-center p-7 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-[#C8C8D0]/40 hover:shadow-premium-lg transition-all duration-300 overflow-hidden">
                  {/* Esquinas decorativas dorada */}
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 w-6 h-px bg-gradient-to-r from-[#C8C8D0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 w-px h-6 bg-gradient-to-b from-[#C8C8D0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span
                    aria-hidden
                    className="absolute bottom-0 right-0 w-6 h-px bg-gradient-to-l from-[#C8C8D0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span
                    aria-hidden
                    className="absolute bottom-0 right-0 w-px h-6 bg-gradient-to-t from-[#C8C8D0] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  />

                  <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] dark:text-[#C39BD3] mb-5 group-hover:bg-gradient-to-br group-hover:from-[#6B4F7A] group-hover:to-[#8B6F9A] group-hover:text-white transition-all duration-300 group-hover:scale-110">
                    <card.icon className="size-7" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-[#1A1A1A] dark:text-white mb-2 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {card.desc}
                  </p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== NOTICIAS ==================== */}
      <section className="relative py-20 sm:py-24 bg-[#F8F5FA] dark:bg-neutral-950 overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection animation="fade-up">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
              <div>
                <SectionEyebrow>Blog</SectionEyebrow>
                <h2 className="mt-4 font-heading text-4xl sm:text-5xl text-[#1A1A1A] dark:text-white leading-tight">
                  Noticias <span className="text-[#6B4F7A]">recientes</span>
                </h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Novedades, lanzamientos y consejos del mundo moto
                </p>
              </div>
              <Link
                href="/noticias"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-[#6B4F7A] hover:text-[#C8C8D0] transition-colors"
              >
                Ver todas
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </AnimatedSection>

          {noticias.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {noticias.map((noticia, idx) => (
                  <AnimatedSection
                    key={noticia.id}
                    animation="fade-up"
                    delay={idx * 100}
                  >
                    <Link
                      href={`/noticias/${noticia.slug}`}
                      className="group h-full flex flex-col rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden shadow-premium-sm hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-[#F8F5FA] to-[#EFEAF2] dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
                        {noticia.imagen ? (
                          <Image
                            src={noticia.imagen}
                            alt={noticia.titulo}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#6B4F7A]/10 to-[#9B59B6]/10">
                            <span className="font-heading text-3xl text-[#6B4F7A]/40">MF</span>
                          </div>
                        )}
                        {noticia.categoria && (
                          <div className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wide shadow-lg">
                            {noticia.categoria}
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">
                          {new Date(noticia.fechaPublicacion).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <h3 className="font-heading text-lg font-semibold text-[#1A1A1A] dark:text-white leading-snug line-clamp-2 group-hover:text-[#6B4F7A] transition-colors">
                          {noticia.titulo}
                        </h3>
                        {noticia.resumen && (
                          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {noticia.resumen}
                          </p>
                        )}
                        <span className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-bold text-[#C8C8D0] group-hover:gap-2 transition-all">
                          Leer más <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </Link>
                  </AnimatedSection>
                ))}
              </div>
              <div className="mt-10 text-center sm:hidden">
                <Link
                  href="/noticias"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6B4F7A] hover:text-[#C8C8D0] transition-colors"
                >
                  Ver todas las noticias
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800">
              <p className="text-gray-400">
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

      {/* ==================== CONTACT CTA FINAL ==================== */}
      <section className="relative py-20 sm:py-24 bg-gradient-to-br from-[#0E0B12] via-[#15121A] to-[#1A1325] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.06]" />
        <div className="absolute inset-0 bg-pattern-noise mix-blend-overlay" />
        <Watermark position="center" size="2xl" opacity="subtle" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection animation="fade-up">
            <SectionEyebrow centered variant="gold">Tu próximo paso</SectionEyebrow>
            <h2 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-6xl text-white text-balance leading-tight">
              ¿Listo para dar el <span className="text-[#C8C8D0]">siguiente paso</span>?
            </h2>
            <GoldDivider variant="ornament" className="mt-8" />
            <p className="mt-8 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
              Visitanos en {BUSINESS.address} o contactanos por WhatsApp. Estamos para
              ayudarte.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/contacto"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] px-8 py-4 text-sm font-bold text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />
                <span className="relative">Contactanos</span>
                <ArrowRight className="relative size-4" />
              </Link>
              <Link
                href="/servicio-tecnico"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.05] backdrop-blur-sm px-8 py-4 text-sm font-bold text-white hover:bg-white/[0.10] hover:border-white/40 transition-colors"
              >
                <Calendar className="size-4" />
                Sacar turno
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  )
}

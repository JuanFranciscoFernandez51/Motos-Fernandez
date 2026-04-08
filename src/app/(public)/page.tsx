import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { BUSINESS, formatPrice, CATEGORIAS_VEHICULO } from "@/lib/constants"
import {
  Bike,
  Car,
  Truck,
  Waves,
  ArrowRight,
  CreditCard,
  Wrench,
  Package,
  Star,
  Calendar,
  ShieldCheck,
} from "lucide-react"

export const dynamic = "force-dynamic"

// ==================== DATA FETCHING ====================

async function getCategoriasDB() {
  // Vehicle categories come from the enum, but we fetch models to show counts
  // Fallback to static list from constants
  return CATEGORIAS_VEHICULO
}

async function getDestacados() {
  try {
    return await prisma.modelo.findMany({
      where: { activo: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { colores: true },
    })
  } catch {
    return []
  }
}

async function getNoticiasRecientes() {
  try {
    return await prisma.noticia.findMany({
      where: { publicado: true },
      orderBy: { fechaPublicacion: "desc" },
      take: 3,
      select: {
        id: true,
        titulo: true,
        slug: true,
        resumen: true,
        imagen: true,
        categoria: true,
        fechaPublicacion: true,
      },
    })
  } catch {
    return []
  }
}

// ==================== ICONS MAP ====================

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  MOTOCICLETA: <Bike className="size-8" />,
  CUATRICICLO: <Car className="size-8" />,
  UTV: <Truck className="size-8" />,
  MOTO_DE_AGUA: <Waves className="size-8" />,
}

// ==================== PAGE ====================

export default async function HomePage() {
  const [modelos, noticias] = await Promise.all([
    getDestacados(),
    getNoticiasRecientes(),
  ])

  return (
    <>
      {/* ===== 1. HERO ===== */}
      <section className="relative bg-[#1A1A1A] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6B4F7A]/20 via-[#6B4F7A]/5 to-transparent" />
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-5" />
        {/* Decorative circles */}
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-[#6B4F7A]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-[400px] rounded-full bg-[#9B59B6]/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-24">
          <div className="max-w-3xl">
            {/* Logo en hero */}
            <div className="mb-8">
              <Image
                src="/images/logo-horizontal-blanco.svg"
                alt={BUSINESS.name}
                width={220}
                height={52}
                className="h-12 w-auto opacity-90"
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] font-heading">
              Tu próxima aventura
              <span className="block text-[#9B59B6] mt-1">empieza aquí</span>
            </h1>
            <p className="mt-5 text-base text-gray-400 max-w-2xl font-body leading-relaxed">
              Más de {BUSINESS.yearsInBusiness} años ayudando a elegir el vehículo perfecto. Visitanos en {BUSINESS.city} y conocé todas las marcas.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/modelos"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-8 py-4 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/30"
              >
                Ver catálogo
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/servicio-tecnico"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors"
              >
                <Calendar className="size-4" />
                Pedir turno
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-10 flex flex-wrap gap-10">
              <div>
                <p className="text-4xl font-extrabold text-white font-heading">+{BUSINESS.yearsInBusiness}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Años</p>
              </div>
              <div className="w-px bg-white/10 self-stretch" />
              <div>
                <p className="text-4xl font-extrabold text-white font-heading">+50</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Marcas</p>
              </div>
              <div className="w-px bg-white/10 self-stretch" />
              <div>
                <p className="text-4xl font-extrabold text-white font-heading">#1</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{BUSINESS.city}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. CATEGORIAS DE VEHICULOS ===== */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
              ¿Qué estás buscando?
            </h2>
            <p className="mt-3 text-gray-500 font-body">
              Exploramos todo tipo de vehículos para tu estilo de vida
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {CATEGORIAS_VEHICULO.map((cat) => (
              <Link
                key={cat.value}
                href={`/modelos?categoria=${cat.value}`}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 text-center hover:border-[#6B4F7A]/40 hover:shadow-xl hover:shadow-[#6B4F7A]/8 transition-all duration-200"
              >
                <div className="flex items-center justify-center size-16 rounded-2xl bg-[#F0F0F0] text-[#4E4B48] group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                  {CATEGORY_ICONS[cat.value]}
                </div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] font-heading group-hover:text-[#6B4F7A] transition-colors">
                  {cat.label}
                </h3>
                <span className="text-xs text-[#6B4F7A] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Ver modelos <ArrowRight className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3. MODELOS DESTACADOS ===== */}
      <section className="py-20 bg-[#F0F0F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
                Modelos destacados
              </h2>
              <p className="mt-3 text-gray-500 font-body">
                Los más elegidos por nuestros clientes
              </p>
            </div>
            <Link
              href="/modelos"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
            >
              Ver todos
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {modelos.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {modelos.map((model) => (
                  <Link
                    key={model.id}
                    href={`/modelos/${model.slug}`}
                    className="group rounded-2xl bg-white overflow-hidden hover:shadow-xl hover:shadow-black/8 transition-all duration-200"
                  >
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                      {model.fotos[0] ? (
                        <Image
                          src={model.fotos[0]}
                          alt={model.nombre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-200">
                          <Bike className="size-16" />
                        </div>
                      )}
                      {model.destacado && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-[#6B4F7A] px-2.5 py-1 text-[11px] font-bold text-white">
                          <Star className="size-3 fill-current" />
                          Destacado
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold text-[#8B6F9A] uppercase tracking-wider">
                        {model.marca}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-[#1A1A1A] font-heading">
                        {model.nombre}
                      </h3>
                      {model.cilindrada && (
                        <p className="text-xs text-gray-400 mt-0.5">{model.cilindrada}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-lg font-bold text-[#6B4F7A]">
                          {model.precio ? formatPrice(model.precio) : "Consultar"}
                        </p>
                        <span className="text-xs font-semibold text-[#6B4F7A] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Ver más <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-10 text-center sm:hidden">
                <Link
                  href="/modelos"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
                >
                  Ver todos los modelos
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl bg-white border border-gray-100">
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

      {/* ===== 4. FINANCIACION PREVIEW ===== */}
      <section className="relative py-20 bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-white/15 mb-6">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-gray-50 transition-colors shadow-lg"
              >
                Ver planes de financiación
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Hablar con un asesor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 5. CONSIGNA DE MOTOS ===== */}
      <section className="py-20 bg-[#F8F5FA]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Texto */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
                Servicio exclusivo
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] font-heading mb-5">
                ¿Querés vender tu moto?
              </h2>
              <p className="text-gray-500 font-body leading-relaxed max-w-lg mx-auto lg:mx-0">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-[#6B4F7A]/30 bg-white px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-[#6B4F7A]/5 hover:border-[#6B4F7A]/60 transition-colors"
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
                  className="rounded-2xl border border-[#6B4F7A]/15 bg-white p-5 hover:border-[#6B4F7A]/35 hover:shadow-md transition-all duration-200"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] font-heading">{item.titulo}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. POR QUE ELEGIRNOS ===== */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
              Desde {BUSINESS.yearFounded}
            </p>
            <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
              ¿Por qué elegirnos?
            </h2>
            <p className="mt-3 text-gray-500 font-body max-w-lg mx-auto">
              Más de {BUSINESS.yearsInBusiness} años de experiencia nos respaldan. Somos
              una empresa familiar con raíces en {BUSINESS.city}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <ShieldCheck className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                {BUSINESS.yearsInBusiness} años de experiencia
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Desde {BUSINESS.yearFounded} ayudamos a miles de clientes a encontrar su
                vehículo ideal con asesoramiento personalizado.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <CreditCard className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                Financiación propia
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Planes flexibles sin necesidad de banco. Financiación propia, tarjeta o
                acuerdo con entidades financieras.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <Wrench className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                Servicio técnico
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Taller oficial con técnicos especializados. Service, reparaciones y
                repuestos originales para todas las marcas.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <Package className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                Stock permanente
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Más de 50 marcas disponibles. Amplio stock de motos, cuatriciclos, UTVs
                y motos de agua para entrega inmediata.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. NOTICIAS RECIENTES ===== */}
      <section className="py-20 bg-[#F0F0F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
                Noticias recientes
              </h2>
              <p className="mt-3 text-gray-500 font-body">
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
                    className="group rounded-2xl bg-white overflow-hidden hover:shadow-xl hover:shadow-black/8 transition-all duration-200"
                  >
                    <div className="relative aspect-video bg-gray-100 overflow-hidden">
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
                      <h3 className="font-bold text-[#1A1A1A] font-heading leading-snug line-clamp-2 group-hover:text-[#6B4F7A] transition-colors">
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
            <div className="text-center py-16 rounded-2xl bg-white border border-gray-100">
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
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
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

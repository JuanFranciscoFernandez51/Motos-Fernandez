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

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-40">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-5 font-body">
              <span className="size-1.5 rounded-full bg-[#8B6F9A] inline-block" />
              Concesionaria multimarca &middot; {BUSINESS.city}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] font-heading">
              Tu pr&oacute;xima aventura
              <span className="block text-[#9B59B6] mt-1">empieza aqu&iacute;</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-xl font-body leading-relaxed">
              M&aacute;s de {BUSINESS.yearsInBusiness} a&ntilde;os ayudando a elegir el veh&iacute;culo
              perfecto. Visit&aacute;nos en {BUSINESS.city} y conoc&eacute; todas las marcas.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/modelos"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-8 py-4 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/30"
              >
                Ver cat&aacute;logo
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
            <div className="mt-16 flex flex-wrap gap-10">
              <div>
                <p className="text-4xl font-extrabold text-white font-heading">+{BUSINESS.yearsInBusiness}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">A&ntilde;os</p>
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
              &iquest;Qu&eacute; est&aacute;s buscando?
            </h2>
            <p className="mt-3 text-gray-500 font-body">
              Exploramos todo tipo de veh&iacute;culos para tu estilo de vida
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
                Los m&aacute;s elegidos por nuestros clientes
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
                          Ver m&aacute;s <ArrowRight className="size-3" />
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
                Pr&oacute;ximamente cargamos nuestro cat&aacute;logo de modelos.
              </p>
              <Link
                href="/contacto"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4F7A] hover:text-[#9B59B6] transition-colors"
              >
                Consult&aacute;nos directamente
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
                Planes de financiaci&oacute;n a medida. Financiaci&oacute;n propia, con banco o
                tarjeta. Entreg&aacute; lo m&iacute;nimo y llev&aacute;te tu veh&iacute;culo hoy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <Link
                href="/financiacion"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[#6B4F7A] hover:bg-gray-50 transition-colors shadow-lg"
              >
                Ver planes de financiaci&oacute;n
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

      {/* ===== 5. POR QUE ELEGIRNOS ===== */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#8B6F9A] font-semibold text-sm uppercase tracking-widest mb-3">
              Desde {BUSINESS.yearFounded}
            </p>
            <h2 className="text-3xl font-bold text-[#1A1A1A] font-heading">
              &iquest;Por qu&eacute; elegirnos?
            </h2>
            <p className="mt-3 text-gray-500 font-body max-w-lg mx-auto">
              M&aacute;s de {BUSINESS.yearsInBusiness} a&ntilde;os de experiencia nos respaldan. Somos
              una empresa familiar con ra&iacute;ces en {BUSINESS.city}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <ShieldCheck className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                {BUSINESS.yearsInBusiness} a&ntilde;os de experiencia
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Desde {BUSINESS.yearFounded} ayudamos a miles de clientes a encontrar su
                veh&iacute;culo ideal con asesoramiento personalizado.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <CreditCard className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                Financiaci&oacute;n propia
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Planes flexibles sin necesidad de banco. Financiaci&oacute;n propia, tarjeta o
                acuerdo con entidades financieras.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 bg-white hover:border-[#6B4F7A]/30 hover:shadow-lg hover:shadow-[#6B4F7A]/5 transition-all duration-200">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-[#6B4F7A]/10 text-[#6B4F7A] mb-5 group-hover:bg-[#6B4F7A] group-hover:text-white transition-all duration-200">
                <Wrench className="size-7" />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A] font-heading mb-2">
                Servicio t&eacute;cnico
              </h3>
              <p className="text-sm text-gray-400 font-body leading-relaxed">
                Taller oficial con t&eacute;cnicos especializados. Service, reparaciones y
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
                M&aacute;s de 50 marcas disponibles. Amplio stock de motos, cuatriciclos, UTVs
                y motos de agua para entrega inmediata.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. NOTICIAS RECIENTES ===== */}
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
                        Leer m&aacute;s <ArrowRight className="size-3" />
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
                Pr&oacute;ximamente publicamos nuestras primeras noticias.
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
            &iquest;Listo para dar el siguiente paso?
          </h2>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto font-body">
            Visit&aacute;nos en {BUSINESS.address} o contact&aacute;nos por WhatsApp.
            Estamos para ayudarte.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 rounded-xl bg-[#6B4F7A] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors shadow-lg shadow-[#6B4F7A]/30"
            >
              Contact&aacute;nos
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

"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice, CATEGORIAS_VEHICULO, ETIQUETAS_MAP } from "@/lib/constants"
import { Bike, Search, Scale, SlidersHorizontal, X, Star, CreditCard } from "lucide-react"
import { useCompare } from "@/components/public/comparador-provider"
import { CompareButton } from "@/components/public/compare-button"
import { WishlistButton } from "@/components/public/wishlist-button"
import { SelloEnvio, esElegiblePromoEnvio } from "@/components/public/sello-envio"
import {
  CamisetaStyles,
  CamisetaStripes,
  CamisetaBadge,
  CamisetaStars,
} from "@/components/public/camiseta-hover"

interface ModeloColor {
  id: string
  nombre: string
  hex: string
  foto: string | null
  modeloId: string
}

interface Modelo {
  id: string
  nombre: string
  slug: string
  marca: string
  categoriaVehiculo: string
  condicion: string
  anio: number | null
  kilometros: number | null
  cilindrada: string | null
  precio: number | null
  moneda: string
  etiqueta?: string | null
  fotos: string[]
  colores: ModeloColor[]
  specs?: Record<string, unknown> | null
  destacado?: boolean
  financiacion?: unknown
  /** "EN_LOCAL" | "EN_DOMICILIO" — badge SOLO WEB en card. */
  tipoTenencia?: string | null
  /** Unidad física real (stock): si tiene chasis o motor cargado. */
  chasis?: string | null
  motor?: string | null
}

// Parseo de cilindrada: "150cc" -> 150, "300 cc" -> 300, null si no se puede
function parseCilindrada(cc: string | null | undefined): number | null {
  if (!cc) return null
  const match = cc.match(/(\d+)/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}


export function CatalogoClient({
  models,
  brands,
  mostrarCondicion = true,
}: {
  models: Modelo[]
  brands: string[]
  /** Mostrar el filtro 0KM/Usadas. En la página /0km se oculta (todas son 0KM). */
  mostrarCondicion?: boolean
}) {
  const [categoria, setCategoria] = useState<string>("TODAS")
  const [condicion, setCondicion] = useState<string>("TODAS")
  const [marca, setMarca] = useState<string>("TODAS")
  const [search, setSearch] = useState("")
  // Sidebar de filtros abierto en mobile (en desktop siempre visible).
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { compareItems } = useCompare()

  // Estado Mundial: promo de envío (sello) + efecto "camiseta" en hover.
  const [promoEnvio, setPromoEnvio] = useState(false)
  const [mundial, setMundial] = useState(false)
  useEffect(() => {
    let vivo = true
    fetch("/api/site/mundial")
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return
        if (d?.promoEnvio) setPromoEnvio(true)
        if (d?.active) setMundial(true)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  // Rangos dinamicos de precio y cilindrada en base al catalogo
  const { precioMinCatalogo, precioMaxCatalogo, cilindradaMaxCatalogo } = useMemo(() => {
    let pMin = Infinity
    let pMax = 0
    let ccMax = 0
    for (const m of models) {
      if (m.precio != null && Number.isFinite(m.precio)) {
        if (m.precio < pMin) pMin = m.precio
        if (m.precio > pMax) pMax = m.precio
      }
      const cc = parseCilindrada(m.cilindrada)
      if (cc != null && cc > ccMax) ccMax = cc
    }
    if (!Number.isFinite(pMin)) pMin = 0
    if (pMax <= pMin) pMax = pMin + 1
    // Minimo razonable para el slider de cilindrada
    const ccLimite = Math.max(ccMax, 1200)
    return {
      precioMinCatalogo: Math.floor(pMin),
      precioMaxCatalogo: Math.ceil(pMax),
      cilindradaMaxCatalogo: ccLimite,
    }
  }, [models])

  const [precioMin, setPrecioMin] = useState<number>(precioMinCatalogo)
  const [precioMax, setPrecioMax] = useState<number>(precioMaxCatalogo)
  const [cilindradaMin, setCilindradaMin] = useState<number>(0)
  const [cilindradaMax, setCilindradaMax] = useState<number>(cilindradaMaxCatalogo)
  const [soloDestacados, setSoloDestacados] = useState(false)
  const [soloConFinanciacion, setSoloConFinanciacion] = useState(false)

  // Re-sincronizar los rangos cuando cambian los limites del catalogo
  useEffect(() => {
    setPrecioMin(precioMinCatalogo)
    setPrecioMax(precioMaxCatalogo)
  }, [precioMinCatalogo, precioMaxCatalogo])

  useEffect(() => {
    setCilindradaMax(cilindradaMaxCatalogo)
  }, [cilindradaMaxCatalogo])

  // Deteccion de filtros avanzados activos (para badge y boton limpiar)
  const precioFiltroActivo =
    precioMin > precioMinCatalogo || precioMax < precioMaxCatalogo
  const cilindradaFiltroActivo =
    cilindradaMin > 0 || cilindradaMax < cilindradaMaxCatalogo
  const filtrosAvanzadosActivos =
    (precioFiltroActivo ? 1 : 0) +
    (cilindradaFiltroActivo ? 1 : 0) +
    (soloDestacados ? 1 : 0) +
    (soloConFinanciacion ? 1 : 0)

  const limpiarFiltrosAvanzados = () => {
    setPrecioMin(precioMinCatalogo)
    setPrecioMax(precioMaxCatalogo)
    setCilindradaMin(0)
    setCilindradaMax(cilindradaMaxCatalogo)
    setSoloDestacados(false)
    setSoloConFinanciacion(false)
  }

  // Limpia TODO (incluye marca, tipo, condición, búsqueda).
  const limpiarTodo = () => {
    setCategoria("TODAS")
    setCondicion("TODAS")
    setMarca("TODAS")
    setSearch("")
    limpiarFiltrosAvanzados()
  }

  // Total de filtros activos (para el botón "Filtros" en mobile).
  const totalFiltrosActivos =
    (categoria !== "TODAS" ? 1 : 0) +
    (mostrarCondicion && condicion !== "TODAS" ? 1 : 0) +
    (marca !== "TODAS" ? 1 : 0) +
    (search.trim() ? 1 : 0) +
    filtrosAvanzadosActivos

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (categoria !== "TODAS" && m.categoriaVehiculo !== categoria) return false
      if (condicion !== "TODAS" && (m.condicion || "0KM") !== condicion) return false
      if (marca !== "TODAS" && m.marca !== marca) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !m.nombre.toLowerCase().includes(q) &&
          !m.marca.toLowerCase().includes(q) &&
          !(m.cilindrada || "").toLowerCase().includes(q)
        )
          return false
      }

      // Filtro de precio: los modelos sin precio siempre pasan
      if (precioFiltroActivo && m.precio != null) {
        if (m.precio < precioMin || m.precio > precioMax) return false
      }

      // Filtro de cilindrada: los modelos sin cilindrada parseable siempre pasan
      if (cilindradaFiltroActivo) {
        const cc = parseCilindrada(m.cilindrada)
        if (cc != null) {
          if (cc < cilindradaMin || cc > cilindradaMax) return false
        }
      }

      // Toggles
      if (soloDestacados && !m.destacado) return false
      if (soloConFinanciacion) {
        if (!Array.isArray(m.financiacion) || m.financiacion.length === 0) return false
      }

      return true
    })
  }, [
    models,
    categoria,
    condicion,
    marca,
    search,
    precioMin,
    precioMax,
    cilindradaMin,
    cilindradaMax,
    soloDestacados,
    soloConFinanciacion,
    precioFiltroActivo,
    cilindradaFiltroActivo,
  ])

  return (
    <>
      <div className="lg:grid lg:grid-cols-[15rem_1fr] xl:grid-cols-[17rem_1fr] lg:gap-8 items-start">
        {/* Botón Filtros (solo mobile) */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="lg:hidden mb-4 inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <SlidersHorizontal className="size-4" />
          Filtros{totalFiltrosActivos > 0 ? ` (${totalFiltrosActivos})` : ""}
        </button>

        {/* ===== SIDEBAR DE FILTROS (estilo MercadoLibre) ===== */}
        <aside
          className={`${sidebarOpen ? "block" : "hidden"} lg:block lg:sticky lg:top-24 mb-6 lg:mb-0 divide-y divide-gray-200 dark:divide-neutral-800`}
        >
        {/* Tipo de moto */}
        <div className="pb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Tipo de moto
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoria("TODAS")}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                categoria === "TODAS"
                  ? "bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] text-white shadow-violeta-soft"
                  : "bg-transparent text-[#4E4B48] dark:text-gray-200 border border-gray-200 dark:border-neutral-700 hover:border-[#6B4F7A]/40"
              }`}
            >
              Todas
            </button>
            {CATEGORIAS_VEHICULO.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoria(cat.value)}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  categoria === cat.value
                    ? "bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] text-white shadow-violeta-soft"
                    : "bg-transparent text-[#4E4B48] dark:text-gray-200 border border-gray-200 dark:border-neutral-700 hover:border-[#6B4F7A]/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Condición — oculto en /0km (todas son 0KM) */}
        {mostrarCondicion && (
        <div className="py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Condición
          </p>
          <div className="flex flex-wrap gap-2">
          {[
            { value: "TODAS", label: "Todas" },
            { value: "0KM", label: "0KM" },
            { value: "USADA", label: "Usadas" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCondicion(opt.value)}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                condicion === opt.value
                  ? opt.value === "0KM"
                    ? "bg-emerald-600 text-white shadow"
                    : opt.value === "USADA"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-gradient-to-r from-[#3D2649] to-[#6B4F7A] text-white shadow-violeta-soft"
                  : "bg-transparent text-[#4E4B48] dark:text-gray-200 border border-gray-200 dark:border-neutral-700 hover:border-[#6B4F7A]/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
          </div>
        </div>
        )}

        {/* Buscar */}
        <div className="py-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar modelo, marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-transparent py-2.5 pl-10 pr-4 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
          </div>
        </div>

        {/* Marca — lista completa, clickeable */}
        <div className="py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Marca
          </p>
          <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setMarca("TODAS")}
              className={`text-left rounded-md px-3 py-1.5 text-sm transition-colors ${
                marca === "TODAS"
                  ? "bg-[#6B4F7A] text-white font-semibold"
                  : "text-[#4E4B48] dark:text-gray-300 hover:bg-[#6B4F7A]/10"
              }`}
            >
              Todas las marcas
            </button>
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setMarca(b)}
                className={`text-left rounded-md px-3 py-1.5 text-sm transition-colors ${
                  marca === b
                    ? "bg-[#6B4F7A] text-white font-semibold"
                    : "text-[#4E4B48] dark:text-gray-300 hover:bg-[#6B4F7A]/10"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Precio — desde / hasta escribible */}
        <div className="py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Precio (ARS)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Desde"
              value={precioMin > precioMinCatalogo ? precioMin : ""}
              onChange={(e) => {
                const v = e.target.value === "" ? precioMinCatalogo : Number(e.target.value)
                if (!Number.isNaN(v)) setPrecioMin(v)
              }}
              className="w-full min-w-0 rounded-lg border border-gray-200 dark:border-neutral-700 bg-transparent py-2 px-3 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
            <span className="text-gray-400 shrink-0">–</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Hasta"
              value={precioMax < precioMaxCatalogo ? precioMax : ""}
              onChange={(e) => {
                const v = e.target.value === "" ? precioMaxCatalogo : Number(e.target.value)
                if (!Number.isNaN(v)) setPrecioMax(v)
              }}
              className="w-full min-w-0 rounded-lg border border-gray-200 dark:border-neutral-700 bg-transparent py-2 px-3 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Los modelos sin precio cargado siempre aparecen.
          </p>
        </div>

        {/* Cilindrada — desde / hasta escribible */}
        <div className="py-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Cilindrada (cc)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="Desde"
              value={cilindradaMin > 0 ? cilindradaMin : ""}
              onChange={(e) => {
                const v = e.target.value === "" ? 0 : Number(e.target.value)
                if (!Number.isNaN(v)) setCilindradaMin(v)
              }}
              className="w-full min-w-0 rounded-lg border border-gray-200 dark:border-neutral-700 bg-transparent py-2 px-3 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
            <span className="text-gray-400 shrink-0">–</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Hasta"
              value={cilindradaMax < cilindradaMaxCatalogo ? cilindradaMax : ""}
              onChange={(e) => {
                const v = e.target.value === "" ? cilindradaMaxCatalogo : Number(e.target.value)
                if (!Number.isNaN(v)) setCilindradaMax(v)
              }}
              className="w-full min-w-0 rounded-lg border border-gray-200 dark:border-neutral-700 bg-transparent py-2 px-3 text-sm text-[#1A1A1A] dark:text-white placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Los modelos sin cilindrada siempre aparecen.
          </p>
        </div>

        {/* Toggles */}
        <div className="py-5">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSoloDestacados((v) => !v)}
                aria-pressed={soloDestacados}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  soloDestacados
                    ? "bg-[#6B4F7A] text-white hover:bg-[#8B6F9A]"
                    : "bg-white dark:bg-neutral-900 text-[#4E4B48] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800"
                }`}
              >
                <Star className={`size-4 ${soloDestacados ? "fill-white" : ""}`} />
                Solo destacados
              </button>
              <button
                type="button"
                onClick={() => setSoloConFinanciacion((v) => !v)}
                aria-pressed={soloConFinanciacion}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  soloConFinanciacion
                    ? "bg-[#6B4F7A] text-white hover:bg-[#8B6F9A]"
                    : "bg-white dark:bg-neutral-900 text-[#4E4B48] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-neutral-800"
                }`}
              >
                <CreditCard className="size-4" />
                Con financiación
              </button>
            </div>
        </div>
        </aside>

        {/* ===== COLUMNA DE RESULTADOS ===== */}
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </p>
            {totalFiltrosActivos > 0 && (
              <button
                type="button"
                onClick={limpiarTodo}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B4F7A] hover:underline"
              >
                <X className="size-3.5" /> Limpiar todo
              </button>
            )}
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Bike className="size-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-body">
            No se encontraron modelos con esos filtros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5 lg:gap-6">
          {mundial && <CamisetaStyles />}
          {filtered.map((model) => (
            <div key={model.id} className="relative">
              {/* Sello promo envío gratis (usadas ≤650cc) — afuera del
                  overflow-hidden de la card para que sobresalga */}
              {promoEnvio && esElegiblePromoEnvio(model) && (
                <div className="absolute -top-4 -left-4 z-30 pointer-events-none">
                  <SelloEnvio size={80} idSuffix={model.id} />
                </div>
              )}
            <article
              className="moto-card group relative rounded-xl sm:rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden shadow-premium-sm hover:shadow-premium-lg transition-all duration-500 hover:-translate-y-1"
            >
              {/* Borde sutil en hover (celeste con Mundial activo, dorado si no) */}
              <div
                aria-hidden
                className={`absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-transparent transition-all duration-500 pointer-events-none z-[1] ${
                  mundial ? "group-hover:ring-2 group-hover:ring-[#75AADB]" : "group-hover:ring-[#C8C8D0]/40"
                }`}
              />
              {/* Link principal — envuelve imagen + info */}
              <Link href={`/catalogo/${model.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-[#F8F5FA] to-[#EFEAF2] dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
                  {model.fotos[0] ? (
                    <Image
                      src={model.fotos[0]}
                      alt={model.nombre}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300">
                      <Bike className="size-10 sm:size-12" />
                    </div>
                  )}
                  {/* Efecto camiseta (Mundial): rayas + badge VAMOS, solo en hover */}
                  {mundial && <CamisetaStripes />}
                  {mundial && !(promoEnvio && esElegiblePromoEnvio(model)) && (
                    <CamisetaBadge className="top-2.5 left-2.5" />
                  )}
                  {/* Overlay gradient bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Chips arriba a la izquierda (no clickeables). Reservamos
                      4rem a la derecha (iconos favoritos/comparar) para que las
                      etiquetas nunca se superpongan. */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col items-start gap-1 sm:gap-1.5 pointer-events-none max-w-[calc(100%-4rem)]">
                    <span
                      className={`rounded-md px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-xs font-bold text-white shadow-lg ${
                        (model.condicion || "0KM") === "0KM"
                          ? "bg-emerald-500/90"
                          : "bg-orange-500/90"
                      }`}
                    >
                      {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
                    </span>
                    {model.etiqueta && ETIQUETAS_MAP[model.etiqueta] && (
                      <span className={`rounded-md px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white shadow-lg truncate max-w-full ${ETIQUETAS_MAP[model.etiqueta].color}`}>
                        {ETIQUETAS_MAP[model.etiqueta].label.toUpperCase()}
                      </span>
                    )}
                    {/* Solo en 0KM mostramos "Consultar disponibilidad". En
                        usadas no va badge de tenencia (más limpio). */}
                    {(model.condicion || "0KM") === "0KM" && (
                      <span
                        className="rounded-md px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white shadow-lg bg-[#6B4F7A] truncate max-w-full"
                        title="Consultanos disponibilidad y entrega de esta unidad 0KM"
                      >
                        CONSULTAR DISPONIBILIDAD
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 sm:p-4 lg:p-5">
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#C8C8D0] uppercase tracking-[0.14em] sm:tracking-[0.18em] truncate">
                    {model.marca}
                  </p>
                  <div className="mt-0.5 sm:mt-1 flex items-start gap-1.5">
                    <h3 className="font-heading text-sm sm:text-lg lg:text-xl font-semibold text-[#1A1A1A] dark:text-white leading-tight line-clamp-2">
                      {model.nombre}
                    </h3>
                    {mundial && <CamisetaStars />}
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
                    {(model.condicion || "0KM") === "USADA" ? (
                      <>
                        {model.anio && <span>{model.anio}</span>}
                        {model.kilometros != null && (
                          <span>{model.anio ? " · " : ""}{model.kilometros.toLocaleString("es-AR")} km</span>
                        )}
                        {model.cilindrada && (
                          <span>{(model.anio || model.kilometros != null) ? " · " : ""}{model.cilindrada}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span>{model.anio || new Date().getFullYear()}</span>
                        <span> · 0 km</span>
                        {model.cilindrada && <span> · {model.cilindrada}</span>}
                      </>
                    )}
                  </p>
                  <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-gray-100 dark:border-neutral-800">
                    {(model.condicion || "0KM") === "0KM" &&
                      !model.chasis?.trim() &&
                      !model.motor?.trim() &&
                      model.precio != null && (
                        <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 leading-tight">
                          Precio sugerido público
                        </p>
                      )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="moto-precio text-base sm:text-lg lg:text-xl font-bold text-[#6B4F7A] dark:text-[#C39BD3]">
                        {model.precio
                          ? (model.moneda || "ARS") === "USD"
                            ? `USD ${model.precio.toLocaleString("es-AR")}`
                            : formatPrice(model.precio)
                          : "Consultar"}
                      </p>
                      <span
                        aria-hidden
                        className="hidden sm:inline-flex text-[#C8C8D0] group-hover:text-[#6B4F7A] group-hover:translate-x-0.5 transition-all shrink-0"
                      >
                        &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Botones interactivos — FUERA del Link (HTML válido).
                  El badge de condición ahora va arriba a la izquierda. */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-1 sm:gap-1.5">
                <WishlistButton
                  variant="icon-floating"
                  item={{
                    id: model.id,
                    slug: model.slug,
                    nombre: model.nombre,
                    marca: model.marca,
                    fotos: model.fotos,
                    precio: model.precio,
                    moneda: model.moneda || "ARS",
                    cilindrada: model.cilindrada,
                    condicion: model.condicion,
                  }}
                />
                <CompareButton
                  variant="icon-floating"
                  item={{
                    id: model.id,
                    slug: model.slug,
                    nombre: model.nombre,
                    marca: model.marca,
                    foto: model.fotos[0] || null,
                    precio: model.precio,
                    moneda: model.moneda || "ARS",
                    cilindrada: model.cilindrada,
                    condicion: model.condicion || "0KM",
                    anio: model.anio,
                    kilometros: model.kilometros,
                    specs: (model.specs as Record<string, unknown> | null) ?? null,
                  }}
                />
              </div>
            </article>
            </div>
          ))}
        </div>
          )}
        </div>
      </div>

      {/* Floating compare pill */}
      {compareItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link
            href="/comparador"
            className="flex items-center gap-2 rounded-full bg-[#6B4F7A] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#8B6F9A] transition-all"
          >
            <Scale className="size-4" />
            Comparar ({compareItems.length} {compareItems.length === 1 ? "modelo" : "modelos"}) &rarr;
          </Link>
        </div>
      )}
    </>
  )
}

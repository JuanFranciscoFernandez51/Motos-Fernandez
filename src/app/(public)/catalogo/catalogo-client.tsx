"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice, CATEGORIAS_VEHICULO, CATEGORIA_VEHICULO_LABELS, ETIQUETAS_MAP } from "@/lib/constants"
import { Bike, Search, Scale, SlidersHorizontal, X, Star, CreditCard } from "lucide-react"
import { useCompare } from "@/components/public/comparador-provider"
import { WishlistButton } from "@/components/public/wishlist-button"

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
}

// Parseo de cilindrada: "150cc" -> 150, "300 cc" -> 300, null si no se puede
function parseCilindrada(cc: string | null | undefined): number | null {
  if (!cc) return null
  const match = cc.match(/(\d+)/)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

// Formato de precio corto para sliders: $1.500.000
function formatPrecioCorto(valor: number): string {
  return `$${valor.toLocaleString("es-AR")}`
}

export function CatalogoClient({
  models,
  brands,
}: {
  models: Modelo[]
  brands: string[]
}) {
  const [categoria, setCategoria] = useState<string>("TODAS")
  const [condicion, setCondicion] = useState<string>("TODAS")
  const [marca, setMarca] = useState<string>("TODAS")
  const [search, setSearch] = useState("")
  const { compareItems, addToCompare, removeFromCompare, isInCompare } = useCompare()

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

  // Estado de filtros avanzados
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false)
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
      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setCategoria("TODAS")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              categoria === "TODAS"
                ? "bg-[#6B4F7A] text-white"
                : "bg-white text-[#4E4B48] hover:bg-gray-100"
            }`}
          >
            Todas
          </button>
          {CATEGORIAS_VEHICULO.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoria(cat.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                categoria === cat.value
                  ? "bg-[#6B4F7A] text-white"
                  : "bg-white text-[#4E4B48] hover:bg-gray-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Condition filter */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { value: "TODAS", label: "Todas" },
            { value: "0KM", label: "0KM" },
            { value: "USADA", label: "Usadas" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCondicion(opt.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                condicion === opt.value
                  ? opt.value === "0KM"
                    ? "bg-emerald-600 text-white"
                    : opt.value === "USADA"
                    ? "bg-orange-500 text-white"
                    : "bg-[#6B4F7A] text-white"
                  : "bg-white text-[#4E4B48] hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search + brand filter */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar modelo, marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
          </div>
          <select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2.5 px-4 text-sm text-[#1A1A1A] focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
          >
            <option value="TODAS">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Boton filtros avanzados + limpiar */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setMostrarAvanzados((v) => !v)}
            aria-expanded={mostrarAvanzados}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mostrarAvanzados || filtrosAvanzadosActivos > 0
                ? "bg-[#6B4F7A] text-white hover:bg-[#8B6F9A]"
                : "bg-white text-[#4E4B48] hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <SlidersHorizontal className="size-4" />
            Filtros avanzados
            {filtrosAvanzadosActivos > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-white text-[#6B4F7A] text-[11px] font-bold px-1.5">
                {filtrosAvanzadosActivos}
              </span>
            )}
          </button>
          {filtrosAvanzadosActivos > 0 && (
            <button
              type="button"
              onClick={limpiarFiltrosAvanzados}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm font-medium text-[#4E4B48] hover:bg-gray-100 transition-colors"
            >
              <X className="size-4" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Panel colapsable de filtros avanzados */}
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
            mostrarAvanzados ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="max-w-3xl mx-auto mt-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slider de precio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-[#1A1A1A]">
                    Precio
                  </label>
                  <span className="text-xs font-medium text-[#6B4F7A]">
                    {formatPrecioCorto(precioMin)} - {formatPrecioCorto(precioMax)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Mínimo</label>
                    <input
                      type="range"
                      min={precioMinCatalogo}
                      max={precioMaxCatalogo}
                      step={Math.max(1, Math.round((precioMaxCatalogo - precioMinCatalogo) / 200))}
                      value={precioMin}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setPrecioMin(Math.min(v, precioMax))
                      }}
                      className="w-full accent-[#6B4F7A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Máximo</label>
                    <input
                      type="range"
                      min={precioMinCatalogo}
                      max={precioMaxCatalogo}
                      step={Math.max(1, Math.round((precioMaxCatalogo - precioMinCatalogo) / 200))}
                      value={precioMax}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setPrecioMax(Math.max(v, precioMin))
                      }}
                      className="w-full accent-[#6B4F7A]"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Los modelos sin precio cargado siempre aparecen.
                </p>
              </div>

              {/* Slider de cilindrada */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-[#1A1A1A]">
                    Cilindrada
                  </label>
                  <span className="text-xs font-medium text-[#6B4F7A]">
                    {cilindradaMin}cc - {cilindradaMax}cc
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Mínimo</label>
                    <input
                      type="range"
                      min={0}
                      max={cilindradaMaxCatalogo}
                      step={10}
                      value={cilindradaMin}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setCilindradaMin(Math.min(v, cilindradaMax))
                      }}
                      className="w-full accent-[#6B4F7A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Máximo</label>
                    <input
                      type="range"
                      min={0}
                      max={cilindradaMaxCatalogo}
                      step={10}
                      value={cilindradaMax}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setCilindradaMax(Math.max(v, cilindradaMin))
                      }}
                      className="w-full accent-[#6B4F7A]"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Los modelos sin cilindrada siempre aparecen.
                </p>
              </div>
            </div>

            {/* Toggles */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSoloDestacados((v) => !v)}
                aria-pressed={soloDestacados}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  soloDestacados
                    ? "bg-[#6B4F7A] text-white hover:bg-[#8B6F9A]"
                    : "bg-white text-[#4E4B48] hover:bg-gray-100 border border-gray-200"
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
                    : "bg-white text-[#4E4B48] hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <CreditCard className="size-4" />
                Con financiación
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Bike className="size-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-body">
            No se encontraron modelos con esos filtros.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((model) => (
            <article
              key={model.id}
              className="group relative rounded-xl bg-white overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all"
            >
              {/* Link principal — envuelve imagen + info */}
              <Link href={`/catalogo/${model.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  {model.fotos[0] ? (
                    <Image
                      src={model.fotos[0]}
                      alt={model.nombre}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300">
                      <Bike className="size-12" />
                    </div>
                  )}
                  {/* Chips arriba a la izquierda (no clickeables) */}
                  <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
                    <span className="rounded-md bg-[#1A1A1A]/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {CATEGORIA_VEHICULO_LABELS[model.categoriaVehiculo] || model.categoriaVehiculo}
                    </span>
                    {model.etiqueta && ETIQUETAS_MAP[model.etiqueta] && (
                      <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold text-white shadow ${ETIQUETAS_MAP[model.etiqueta].color}`}>
                        {ETIQUETAS_MAP[model.etiqueta].label.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-medium text-[#8B6F9A] uppercase tracking-wider">
                    {model.marca}
                  </p>
                  <h3
                    className="mt-1 text-lg font-bold text-[#1A1A1A]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {model.nombre}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
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
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-[#6B4F7A]">
                      {model.precio
                        ? (model.moneda || "ARS") === "USD"
                          ? `USD ${model.precio.toLocaleString("es-AR")}`
                          : formatPrice(model.precio)
                        : "Consultar"}
                    </p>
                    <span className="text-xs font-medium text-[#6B4F7A] group-hover:text-[#9B59B6] transition-colors">
                      Ver detalle &rarr;
                    </span>
                  </div>
                </div>
              </Link>

              {/* Badge de condición + botones interactivos — FUERA del Link (HTML válido) */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <span
                  className={`pointer-events-none rounded-md px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                    (model.condicion || "0KM") === "0KM"
                      ? "bg-emerald-500/90 text-white"
                      : "bg-orange-500/90 text-white"
                  }`}
                >
                  {(model.condicion || "0KM") === "0KM" ? "0KM" : "USADA"}
                </span>
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
                <button
                  type="button"
                  onClick={() =>
                    isInCompare(model.id)
                      ? removeFromCompare(model.id)
                      : addToCompare({
                          id: model.id,
                          slug: model.slug,
                          nombre: model.nombre,
                          marca: model.marca,
                          foto: model.fotos[0] || null,
                          precio: model.precio,
                          moneda: model.moneda,
                          cilindrada: model.cilindrada,
                          condicion: model.condicion || "0KM",
                          anio: model.anio,
                          kilometros: model.kilometros,
                          specs: (model.specs as Record<string, unknown> | null) ?? null,
                        })
                  }
                  aria-label={isInCompare(model.id) ? "Quitar del comparador" : "Agregar al comparador"}
                  title={isInCompare(model.id) ? "Quitar del comparador" : "Comparar modelo"}
                  className={`inline-flex items-center justify-center size-9 rounded-full backdrop-blur-sm shadow-sm transition-all ${
                    isInCompare(model.id)
                      ? "bg-[#6B4F7A] text-white hover:bg-[#8B6F9A]"
                      : "bg-white/90 text-[#6B4F7A] hover:bg-white"
                  }`}
                >
                  <Scale className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

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

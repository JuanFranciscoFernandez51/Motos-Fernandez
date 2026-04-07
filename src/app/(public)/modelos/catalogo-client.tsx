"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice, CATEGORIAS_VEHICULO, CATEGORIA_VEHICULO_LABELS } from "@/lib/constants"
import { Bike, Search } from "lucide-react"

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
  cilindrada: string | null
  precio: number | null
  fotos: string[]
  colores: ModeloColor[]
}

export function CatalogoClient({
  models,
  brands,
}: {
  models: Modelo[]
  brands: string[]
}) {
  const [categoria, setCategoria] = useState<string>("TODAS")
  const [marca, setMarca] = useState<string>("TODAS")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (categoria !== "TODAS" && m.categoriaVehiculo !== categoria) return false
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
      return true
    })
  }, [models, categoria, marca, search])

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
            <Link
              key={model.id}
              href={`/modelos/${model.slug}`}
              className="group rounded-xl bg-white overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all"
            >
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
                <span className="absolute top-3 left-3 rounded-md bg-[#1A1A1A]/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {CATEGORIA_VEHICULO_LABELS[model.categoriaVehiculo] || model.categoriaVehiculo}
                </span>
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
                {model.cilindrada && (
                  <p className="text-xs text-gray-400 mt-0.5">{model.cilindrada}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-bold text-[#6B4F7A]">
                    {model.precio ? formatPrice(model.precio) : "Consultar"}
                  </p>
                  <span className="text-xs font-medium text-[#6B4F7A] group-hover:text-[#9B59B6] transition-colors">
                    Ver detalle &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

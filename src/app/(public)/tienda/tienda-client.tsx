"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice } from "@/lib/constants"
import { Search, ShoppingBag } from "lucide-react"

interface Categoria {
  id: string
  nombre: string
  slug: string
  _count: { productos: number }
}

interface Producto {
  id: string
  nombre: string
  slug: string
  precio: number
  precioOferta: number | null
  fotos: string[]
  stock: number
  categoriaId: string
  categoria: { id: string; nombre: string; slug: string }
}

export function TiendaClient({
  productos,
  categorias,
}: {
  productos: Producto[]
  categorias: Categoria[]
}) {
  const [categoriaId, setCategoriaId] = useState<string>("TODAS")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      if (categoriaId !== "TODAS" && p.categoriaId !== categoriaId) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.nombre.toLowerCase().includes(q) &&
          !p.categoria.nombre.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [productos, categoriaId, search])

  return (
    <>
      {/* Filters */}
      <div className="mb-8 space-y-4">
        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setCategoriaId("TODAS")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              categoriaId === "TODAS"
                ? "bg-[#6B4F7A] text-white"
                : "bg-white text-[#4E4B48] hover:bg-gray-100"
            }`}
          >
            Todas ({productos.length})
          </button>
          {categorias
            .filter((c) => c._count.productos > 0)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaId(cat.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  categoriaId === cat.id
                    ? "bg-[#6B4F7A] text-white"
                    : "bg-white text-[#4E4B48] hover:bg-gray-100"
                }`}
              >
                {cat.nombre} ({cat._count.productos})
              </button>
            ))}
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#6B4F7A] focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]/20"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <ShoppingBag className="size-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron productos con esos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((producto) => (
            <Link
              key={producto.id}
              href={`/tienda/${producto.slug}`}
              className="group rounded-xl bg-white overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all flex flex-col"
            >
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                {producto.fotos[0] ? (
                  <Image
                    src={producto.fotos[0]}
                    alt={producto.nombre}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <ShoppingBag className="size-12" />
                  </div>
                )}
                {producto.precioOferta && (
                  <span className="absolute top-3 right-3 rounded-md bg-[#9B59B6] px-2.5 py-1 text-xs font-bold text-white">
                    OFERTA
                  </span>
                )}
                {producto.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#1A1A1A]">
                      Sin stock
                    </span>
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="text-xs font-medium text-[#8B6F9A] uppercase tracking-wider">
                  {producto.categoria.nombre}
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#1A1A1A] line-clamp-2 flex-1">
                  {producto.nombre}
                </h3>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    {producto.precioOferta ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#6B4F7A]">
                          {formatPrice(producto.precioOferta)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(producto.precio)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-[#6B4F7A]">
                        {formatPrice(producto.precio)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#6B4F7A] group-hover:text-[#9B59B6] transition-colors">
                    Ver &rarr;
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

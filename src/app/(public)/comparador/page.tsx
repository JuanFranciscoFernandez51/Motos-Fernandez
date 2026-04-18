"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo } from "react"
import { Bike, Scale, Trash2, X, MessageCircle } from "lucide-react"
import { useCompare, type CompareItem } from "@/components/public/comparador-provider"
import { formatPrice, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"

function formatPrecio(item: CompareItem): string {
  if (item.precio == null) return "Consultar"
  if ((item.moneda || "ARS") === "USD") {
    return `USD ${item.precio.toLocaleString("es-AR")}`
  }
  return formatPrice(item.precio)
}

function formatKm(km: number | null): string {
  if (km == null) return "—"
  return `${km.toLocaleString("es-AR")} km`
}

function valueToString(val: unknown): string {
  if (val == null || val === "") return "—"
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return String(val)
  }
  try {
    return JSON.stringify(val)
  } catch {
    return "—"
  }
}

export default function ComparadorPage() {
  const { compareItems, removeFromCompare, clearCompare, hydrated } = useCompare()

  // Merge spec keys from all items
  const specKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const item of compareItems) {
      if (item.specs && typeof item.specs === "object") {
        for (const k of Object.keys(item.specs)) {
          keys.add(k)
        }
      }
    }
    return Array.from(keys)
  }, [compareItems])

  // Wait for hydration to avoid mismatch
  if (!hydrated) {
    return (
      <section className="bg-[#F0F0F0] min-h-[60vh] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse text-gray-400">Cargando comparador...</div>
        </div>
      </section>
    )
  }

  if (compareItems.length === 0) {
    return (
      <section className="bg-[#F0F0F0] min-h-[60vh] py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white border border-gray-100 p-10 text-center">
            <Scale className="size-12 text-[#6B4F7A] mx-auto mb-4" />
            <h1
              className="text-2xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Comparador de Modelos
            </h1>
            <p className="mt-3 text-gray-500">
              Agregá modelos al comparador desde el catálogo para verlos lado a lado.
            </p>
            <Link
              href="/modelos"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              Ir al catálogo
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const cols = compareItems.length

  return (
    <section className="bg-[#F0F0F0] min-h-[60vh] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Comparador de Modelos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {compareItems.length} {compareItems.length === 1 ? "modelo" : "modelos"} seleccionado
              {compareItems.length === 1 ? "" : "s"} (máximo 3)
            </p>
          </div>
          <button
            type="button"
            onClick={clearCompare}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#4E4B48] hover:bg-gray-50 hover:border-gray-300 transition-colors self-start"
          >
            <Trash2 className="size-4" />
            Limpiar comparación
          </button>
        </div>

        {/* Desktop: table layout */}
        <div className="hidden md:block rounded-xl bg-white border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-40 bg-gray-50 border-b border-gray-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Modelo
                  </th>
                  {compareItems.map((item) => (
                    <th
                      key={item.id}
                      className="border-b border-gray-100 p-4 text-center align-top"
                      style={{ width: `${(100 - 15) / cols}%` }}
                    >
                      <div className="relative flex flex-col items-center gap-3">
                        <button
                          type="button"
                          onClick={() => removeFromCompare(item.id)}
                          className="absolute -top-1 -right-1 inline-flex items-center justify-center size-7 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
                          aria-label="Quitar del comparador"
                        >
                          <X className="size-4" />
                        </button>
                        <div className="relative size-28 rounded-lg bg-gray-100 overflow-hidden">
                          {item.foto ? (
                            <Image
                              src={item.foto}
                              alt={item.nombre}
                              fill
                              className="object-cover"
                              sizes="112px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">
                              <Bike className="size-8" />
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Marca
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center text-[#1A1A1A]">
                      {item.marca}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Nombre
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center font-semibold text-[#1A1A1A]">
                      {item.nombre}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Condición
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                          item.condicion === "USADA"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.condicion}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Año
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center text-[#1A1A1A]">
                      {item.anio ?? "—"}
                    </td>
                  ))}
                </tr>
                {compareItems.some((i) => i.condicion === "USADA") && (
                  <tr>
                    <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                      Kilómetros
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center text-[#1A1A1A]">
                        {item.condicion === "USADA" ? formatKm(item.kilometros) : "—"}
                      </td>
                    ))}
                  </tr>
                )}
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Cilindrada
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center text-[#1A1A1A]">
                      {item.cilindrada || "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Precio
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center text-base font-bold text-[#6B4F7A]">
                      {formatPrecio(item)}
                    </td>
                  ))}
                </tr>

                {/* Specs dinámicas */}
                {specKeys.length > 0 && (
                  <tr>
                    <td
                      colSpan={cols + 1}
                      className="bg-[#6B4F7A]/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B4F7A]"
                    >
                      Especificaciones técnicas
                    </td>
                  </tr>
                )}
                {specKeys.map((key) => (
                  <tr key={key}>
                    <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                      {key}
                    </td>
                    {compareItems.map((item) => {
                      const val =
                        item.specs && typeof item.specs === "object"
                          ? (item.specs as Record<string, unknown>)[key]
                          : undefined
                      return (
                        <td key={item.id} className="border-t border-gray-50 px-4 py-3 text-center text-[#1A1A1A]">
                          {valueToString(val)}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Acciones */}
                <tr>
                  <td className="bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B4F7A]">
                    Acciones
                  </td>
                  {compareItems.map((item) => (
                    <td key={item.id} className="border-t border-gray-50 px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Link
                          href={`/modelos/${item.slug}`}
                          className="inline-flex items-center justify-center rounded-lg bg-[#6B4F7A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8B6F9A] transition-colors w-full max-w-[160px]"
                        >
                          Ver detalle
                        </Link>
                        <a
                          href={getWhatsAppUrl(
                            WHATSAPP_MESSAGES.modelo({
                              nombre: item.nombre,
                              marca: item.marca,
                              precio: formatPrecio(item),
                              slug: item.slug,
                              condicion: item.condicion,
                            })
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#25D366] bg-white px-3 py-1.5 text-xs font-semibold text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors w-full max-w-[160px]"
                        >
                          <MessageCircle className="size-3" />
                          WhatsApp
                        </a>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-4">
          {compareItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-white border border-gray-100 overflow-hidden"
            >
              <div className="relative">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                  {item.foto ? (
                    <Image
                      src={item.foto}
                      alt={item.nombre}
                      width={640}
                      height={480}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300">
                      <Bike className="size-12" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCompare(item.id)}
                  className="absolute top-3 right-3 inline-flex items-center justify-center size-8 rounded-full bg-white/90 border border-gray-200 text-gray-600 hover:text-red-600 backdrop-blur-sm"
                  aria-label="Quitar del comparador"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-[#8B6F9A] uppercase tracking-wider">
                  {item.marca}
                </p>
                <h3
                  className="mt-1 text-lg font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.nombre}
                </h3>
                <p className="mt-2 text-lg font-bold text-[#6B4F7A]">
                  {formatPrecio(item)}
                </p>

                <dl className="mt-4 divide-y divide-gray-100 text-sm">
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-gray-500">Condición</dt>
                    <dd className="font-medium text-[#1A1A1A]">{item.condicion}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-gray-500">Año</dt>
                    <dd className="font-medium text-[#1A1A1A]">{item.anio ?? "—"}</dd>
                  </div>
                  {item.condicion === "USADA" && (
                    <div className="flex items-center justify-between py-2">
                      <dt className="text-gray-500">Kilómetros</dt>
                      <dd className="font-medium text-[#1A1A1A]">{formatKm(item.kilometros)}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-gray-500">Cilindrada</dt>
                    <dd className="font-medium text-[#1A1A1A]">{item.cilindrada || "—"}</dd>
                  </div>
                  {specKeys.map((key) => {
                    const val =
                      item.specs && typeof item.specs === "object"
                        ? (item.specs as Record<string, unknown>)[key]
                        : undefined
                    return (
                      <div key={key} className="flex items-start justify-between py-2 gap-3">
                        <dt className="text-gray-500">{key}</dt>
                        <dd className="font-medium text-[#1A1A1A] text-right">
                          {valueToString(val)}
                        </dd>
                      </div>
                    )
                  })}
                </dl>

                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/modelos/${item.slug}`}
                    className="inline-flex items-center justify-center rounded-lg bg-[#6B4F7A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
                  >
                    Ver detalle
                  </Link>
                  <a
                    href={getWhatsAppUrl(
                      WHATSAPP_MESSAGES.modelo({
                        nombre: item.nombre,
                        marca: item.marca,
                        precio: formatPrecio(item),
                        slug: item.slug,
                        condicion: item.condicion,
                      })
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#25D366] bg-white px-4 py-2 text-sm font-semibold text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/modelos"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6B4F7A] hover:text-[#8B6F9A]"
          >
            &larr; Volver al catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}

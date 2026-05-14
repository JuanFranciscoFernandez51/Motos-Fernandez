"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bike,
  Search,
  X,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Tag as TagIcon,
  Plus,
} from "lucide-react"
import { formatMoney } from "@/lib/admin-helpers"
import { NuevaMotoQuickModal } from "@/components/admin/operativo/nueva-moto-quick-modal"

export type StockMotoUI = {
  id: string
  codigo: string | null
  slug: string
  marca: string
  nombre: string
  condicion: string
  anio: number | null
  kilometros: number | null
  chasis: string | null
  motor: string | null
  patente: string | null
  precio: number | null
  moneda: string
  activo: boolean
  vendida: boolean
  fechaVenta: string | null
  etiqueta: string | null
  origen: string | null
  proveedor: string | null
  clienteEntrega: string | null
  ocVentaNumero: number | null
  ocVentaId: string | null
  fotoPrincipal: string | null
  createdAt: string
}

const ORIGEN_LABEL: Record<string, { label: string; color: string }> = {
  STOCK_PROPIO: { label: "Stock propio", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  PARTE_DE_PAGO: { label: "Parte de pago", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  // MANDATO = moto que un cliente nos consigno para que vendamos. En la
  // UI le decimos "Cliente" porque es mas claro para la administracion:
  // la moto la trajo un cliente, abajo aparece "de XXXXX" con el nombre.
  MANDATO: { label: "Cliente", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  UNIDAD_VENDIDA_0KM: { label: "Unidad vendida (0KM)", color: "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300" },
}

type Filtro = "DISPONIBLES" | "VENDIDAS" | "TODAS"

export function StockMotosClient({ motos }: { motos: StockMotoUI[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("DISPONIBLES")
  const [condicion, setCondicion] = useState<"TODAS" | "0KM" | "USADA">("TODAS")
  const [origenFiltro, setOrigenFiltro] = useState<string>("TODOS")
  const [showNuevaModal, setShowNuevaModal] = useState(false)

  const counts = useMemo(
    () => ({
      total: motos.length,
      disponibles: motos.filter((m) => !m.vendida).length,
      vendidas: motos.filter((m) => m.vendida).length,
      cero: motos.filter((m) => !m.vendida && m.condicion === "0KM").length,
      usadas: motos.filter((m) => !m.vendida && m.condicion === "USADA").length,
    }),
    [motos]
  )

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    return motos.filter((m) => {
      if (filtro === "DISPONIBLES" && m.vendida) return false
      if (filtro === "VENDIDAS" && !m.vendida) return false
      if (condicion !== "TODAS" && m.condicion !== condicion) return false
      if (origenFiltro !== "TODOS" && (m.origen || "STOCK_PROPIO") !== origenFiltro) return false
      if (!q) return true
      const hay = [
        m.codigo,
        m.slug,
        m.marca,
        m.nombre,
        m.chasis,
        m.motor,
        m.patente,
        m.proveedor,
        m.clienteEntrega,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [motos, query, filtro, condicion, origenFiltro])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bike className="size-6 text-[#6B4F7A]" />
            Stock motos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Listado administrativo de todas las motos (datos internos: chasis,
            motor, patente, precios, origen). Esta es una vista paralela al
            catálogo público — no editás fotos, descripción ni SEO desde acá.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFiltro("DISPONIBLES")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filtro === "DISPONIBLES"
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Disponibles</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {counts.disponibles}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {counts.cero} 0KM · {counts.usadas} usadas
          </p>
        </button>
        <button
          onClick={() => setFiltro("VENDIDAS")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filtro === "VENDIDAS"
              ? "border-gray-500 bg-gray-50 dark:bg-neutral-800/50"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Vendidas</p>
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            {counts.vendidas}
          </p>
        </button>
        <button
          onClick={() => setFiltro("TODAS")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filtro === "TODAS"
              ? "border-[#6B4F7A] bg-[#6B4F7A]/5"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total histórico</p>
          <p className="text-2xl font-bold text-[#6B4F7A]">{counts.total}</p>
        </button>
        <div className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Condición</p>
          <select
            value={condicion}
            onChange={(e) => setCondicion(e.target.value as typeof condicion)}
            className="mt-1 w-full text-sm bg-transparent outline-none font-semibold text-gray-900 dark:text-gray-100"
          >
            <option value="TODAS">Todas</option>
            <option value="0KM">Solo 0KM</option>
            <option value="USADA">Solo Usadas</option>
          </select>
        </div>
      </div>

      {/* Filtros: buscador + origen */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código, marca, modelo, chasis, motor, patente..."
            className="w-full pl-10 pr-9 py-2 text-sm rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <select
          value={origenFiltro}
          onChange={(e) => setOrigenFiltro(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
        >
          <option value="TODOS">Todos los orígenes</option>
          <option value="STOCK_PROPIO">Stock propio</option>
          <option value="PARTE_DE_PAGO">Parte de pago</option>
          <option value="MANDATO">Cliente (consignación)</option>
          <option value="UNIDAD_VENDIDA_0KM">Unidad vendida 0KM</option>
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filtradas.length} de {motos.length} motos
        </span>
        <button
          type="button"
          onClick={() => setShowNuevaModal(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white px-3 py-2 text-sm font-medium shadow-sm"
        >
          <Plus className="size-4" />
          Nueva moto
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800/40">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3 whitespace-nowrap">Código</th>
                <th className="px-3 py-3">Moto</th>
                <th className="px-3 py-3 whitespace-nowrap">Año / Km</th>
                <th className="px-3 py-3 whitespace-nowrap">Chasis</th>
                <th className="px-3 py-3 whitespace-nowrap">Motor</th>
                <th className="px-3 py-3 whitespace-nowrap">Patente</th>
                <th className="px-3 py-3 whitespace-nowrap">Precio</th>
                <th className="px-3 py-3 whitespace-nowrap">Origen</th>
                <th className="px-3 py-3 whitespace-nowrap">Estado</th>
                <th className="px-3 py-3 whitespace-nowrap text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-gray-400">
                    <Bike className="size-8 mx-auto mb-2 text-gray-300" />
                    Sin resultados con esos filtros
                  </td>
                </tr>
              ) : (
                filtradas.map((m) => {
                  const oc = ORIGEN_LABEL[m.origen || "STOCK_PROPIO"]
                  return (
                    <tr
                      key={m.id}
                      className="border-t border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/50"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-[#6B4F7A] whitespace-nowrap">
                        {m.codigo || "—"}
                      </td>
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          {m.fotoPrincipal && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.fotoPrincipal}
                              alt=""
                              className="size-9 rounded-md object-cover bg-gray-100 dark:bg-neutral-800 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {m.marca} {m.nombre}
                            </p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 truncate">
                              <span
                                className={`inline-block size-1.5 rounded-full ${
                                  m.condicion === "0KM"
                                    ? "bg-emerald-500"
                                    : "bg-orange-500"
                                }`}
                              />
                              {m.condicion}
                              {m.etiqueta && (
                                <>
                                  {" · "}
                                  <TagIcon className="size-3" />
                                  {m.etiqueta.replace(/_/g, " ").toLowerCase()}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {m.anio || "—"}
                        {m.kilometros != null && (
                          <p className="text-gray-400">
                            {m.kilometros.toLocaleString("es-AR")} km
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {m.chasis || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {m.motor || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {m.patente || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {m.precio ? (
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatMoney(m.precio, m.moneda)}
                          </span>
                        ) : (
                          <span className="text-gray-300">Consultar</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${oc.color}`}>
                          {oc.label}
                        </span>
                        {m.proveedor && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {m.proveedor}
                          </p>
                        )}
                        {m.clienteEntrega && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">
                            de {m.clienteEntrega}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {m.vendida ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium">
                              <CheckCircle2 className="size-3" />
                              Vendida
                            </span>
                            {m.fechaVenta && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(m.fechaVenta).toLocaleDateString("es-AR")}
                              </p>
                            )}
                          </div>
                        ) : m.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                            Disponible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                            <AlertCircle className="size-3" />
                            Sin publicar
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {m.ocVentaId && (
                            <Link
                              href={`/admin/ordenes-compra/${m.ocVentaId}`}
                              title={`Ver OC-${String(m.ocVentaNumero).padStart(4, "0")}`}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 hover:underline px-1.5"
                            >
                              <FileText className="size-3" />
                              OC-{String(m.ocVentaNumero).padStart(4, "0")}
                            </Link>
                          )}
                          <Link
                            href={`/admin/modelos/${m.id}?volver=stock`}
                            className="inline-flex items-center gap-1 text-xs text-[#6B4F7A] hover:underline px-1.5"
                            title="Ver ficha completa"
                          >
                            <Eye className="size-3" />
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nueva moto — reusa el mismo flujo que el form de OC.
          La moto se crea con activo=false: aparece en stock motos pero
          NO en el catalogo publico hasta que la actives desde /admin/modelos. */}
      <NuevaMotoQuickModal
        open={showNuevaModal}
        onClose={() => setShowNuevaModal(false)}
        onCreated={() => {
          setShowNuevaModal(false)
          // Refresh server-side para que aparezca en la tabla.
          router.refresh()
        }}
      />
    </div>
  )
}

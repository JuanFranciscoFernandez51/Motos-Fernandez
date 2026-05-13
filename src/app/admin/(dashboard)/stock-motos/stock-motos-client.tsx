"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Bike,
  Search,
  X,
  FileText,
  Receipt,
  Wallet,
  Archive,
  ExternalLink,
} from "lucide-react"
import { formatMoney } from "@/lib/admin-helpers"

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
  origen: string
  proveedor: string | null
  fotoPrincipal: string | null
  dueno:
    | {
        tipo: "MANDATO" | "PERMUTA"
        nombre: string
        clienteId: string
        mandatoId?: string
        mandatoNumero?: number
        ocId?: string
        ocNumero?: number
      }
    | null
  precioCompra: { monto: number; moneda: string } | null
  ocVenta: {
    id: string
    numero: number
    precioVenta: number
    moneda: string
    fecha: string
  } | null
  estado: "EN_STOCK" | "RESERVADA" | "VENDIDA"
  createdAt: string
}

const ORIGEN_LABEL: Record<string, string> = {
  STOCK_PROPIO: "Stock propio",
  PARTE_DE_PAGO: "Permuta",
  MANDATO: "Mandato",
  UNIDAD_VENDIDA_0KM: "Clon 0KM",
}

type TabKey = "EN_STOCK" | "RESERVADAS" | "VENDIDAS" | "TODAS"

export function StockMotosClient({ motos }: { motos: StockMotoUI[] }) {
  const [tab, setTab] = useState<TabKey>("EN_STOCK")
  const [query, setQuery] = useState("")
  const [marcaFiltro, setMarcaFiltro] = useState<string>("TODAS")
  const [origenFiltro, setOrigenFiltro] = useState<string>("TODOS")

  // Marcas únicas para el filtro
  const marcas = useMemo(() => {
    const set = new Set<string>()
    for (const m of motos) if (m.marca) set.add(m.marca)
    return Array.from(set).sort()
  }, [motos])

  const counts = useMemo(
    () => ({
      enStock: motos.filter((m) => m.estado === "EN_STOCK").length,
      reservadas: motos.filter((m) => m.estado === "RESERVADA").length,
      vendidas: motos.filter((m) => m.estado === "VENDIDA").length,
      todas: motos.length,
    }),
    [motos]
  )

  // Stats arriba (sobre el conjunto activo, no las vendidas)
  const stats = useMemo(() => {
    const enInventario = motos.filter((m) => m.estado !== "VENDIDA")
    const valorListaARS = enInventario
      .filter((m) => m.moneda === "ARS" && m.precio)
      .reduce((s, m) => s + (m.precio || 0), 0)
    const valorListaUSD = enInventario
      .filter((m) => m.moneda === "USD" && m.precio)
      .reduce((s, m) => s + (m.precio || 0), 0)
    const valorCompraARS = enInventario
      .filter((m) => m.precioCompra?.moneda === "ARS")
      .reduce((s, m) => s + (m.precioCompra?.monto || 0), 0)
    const valorCompraUSD = enInventario
      .filter((m) => m.precioCompra?.moneda === "USD")
      .reduce((s, m) => s + (m.precioCompra?.monto || 0), 0)
    return {
      enInventario: enInventario.length,
      valorListaARS,
      valorListaUSD,
      valorCompraARS,
      valorCompraUSD,
      vendidasHist: counts.vendidas,
    }
  }, [motos, counts.vendidas])

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    return motos.filter((m) => {
      if (tab === "EN_STOCK" && m.estado !== "EN_STOCK") return false
      if (tab === "RESERVADAS" && m.estado !== "RESERVADA") return false
      if (tab === "VENDIDAS" && m.estado !== "VENDIDA") return false
      if (marcaFiltro !== "TODAS" && m.marca !== marcaFiltro) return false
      if (origenFiltro !== "TODOS" && m.origen !== origenFiltro) return false
      if (!q) return true
      const hay = [
        m.codigo,
        m.slug,
        m.marca,
        m.nombre,
        m.chasis,
        m.motor,
        m.patente,
        m.dueno?.nombre,
        m.proveedor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [motos, tab, query, marcaFiltro, origenFiltro])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Stock de motos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Inventario físico con chasis y motor.{" "}
          <span className="font-medium">{stats.enInventario} en stock</span>
          {" · "}
          <span className="font-medium">{stats.vendidasHist} vendidas</span>
          {". "}
          <span className="text-xs">
            Esta vista está sincronizada con el catálogo público: si una moto
            se vende desde una OC, pasa a "Vendidas" automáticamente.
          </span>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Bike className="size-5" />}
          label="Motos en stock"
          value={String(stats.enInventario)}
          color="emerald"
        />
        <StatCard
          icon={<Wallet className="size-5" />}
          label="Valor en stock (lista)"
          value={formatPriceMix(stats.valorListaARS, stats.valorListaUSD)}
          color="teal"
        />
        <StatCard
          icon={<Receipt className="size-5" />}
          label="Valor de compra / toma"
          value={
            stats.valorCompraARS === 0 && stats.valorCompraUSD === 0
              ? "—"
              : formatPriceMix(stats.valorCompraARS, stats.valorCompraUSD)
          }
          color="purple"
          hint={
            stats.valorCompraARS === 0 && stats.valorCompraUSD === 0
              ? "Sin precios de compra cargados"
              : null
          }
        />
        <StatCard
          icon={<Archive className="size-5" />}
          label="Vendidas (histórico)"
          value={String(stats.vendidasHist)}
          color="gray"
        />
      </div>

      {/* Tabs */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 p-1.5">
        <div className="flex flex-wrap gap-1">
          {(
            [
              { key: "EN_STOCK", label: "En stock", count: counts.enStock },
              { key: "RESERVADAS", label: "Reservadas", count: counts.reservadas },
              { key: "VENDIDAS", label: "Vendidas", count: counts.vendidas },
              { key: "TODAS", label: "Todas", count: counts.todas },
            ] as const
          ).map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 ${
                  active
                    ? "bg-[#6B4F7A]/10 text-[#6B4F7A]"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                }`}
              >
                {t.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    active
                      ? "bg-[#6B4F7A]/15 text-[#6B4F7A]"
                      : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por chasis, motor, modelo, dueño..."
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
          value={marcaFiltro}
          onChange={(e) => setMarcaFiltro(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
        >
          <option value="TODAS">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={origenFiltro}
          onChange={(e) => setOrigenFiltro(e.target.value)}
          className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
        >
          <option value="TODOS">Todos los orígenes</option>
          <option value="STOCK_PROPIO">Stock propio</option>
          <option value="PARTE_DE_PAGO">Permuta</option>
          <option value="MANDATO">Mandato</option>
          <option value="UNIDAD_VENDIDA_0KM">Clon 0KM</option>
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {filtradas.length} de {motos.length}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                <th className="px-3 py-3 whitespace-nowrap">Chasis / Motor</th>
                <th className="px-3 py-3">Modelo</th>
                <th className="px-3 py-3 whitespace-nowrap">Año / Km</th>
                <th className="px-3 py-3 whitespace-nowrap">Patente</th>
                <th className="px-3 py-3">Dueño / Referencia</th>
                <th className="px-3 py-3 whitespace-nowrap text-right">
                  Compra / Toma
                </th>
                <th className="px-3 py-3 whitespace-nowrap text-right">Venta</th>
                <th className="px-3 py-3 whitespace-nowrap">Estado</th>
                <th className="px-3 py-3 whitespace-nowrap text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-14 text-center text-gray-400"
                  >
                    <Bike className="size-8 mx-auto mb-2 text-gray-300" />
                    Sin resultados con esos filtros
                  </td>
                </tr>
              ) : (
                filtradas.map((m) => <FilaMoto key={m.id} m={m} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilaMoto({ m }: { m: StockMotoUI }) {
  return (
    <tr className="border-t border-gray-100 dark:border-neutral-800 hover:bg-gray-50/50 dark:hover:bg-neutral-900/40">
      {/* Chasis / Motor */}
      <td className="px-3 py-3 align-top whitespace-nowrap">
        <p className="font-mono text-[11px] font-semibold text-gray-900 dark:text-gray-100">
          {m.chasis || <span className="text-gray-300">— sin chasis —</span>}
        </p>
        <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          Motor: {m.motor || "—"}
        </p>
        {m.codigo && (
          <p className="text-[10px] text-[#6B4F7A] font-mono mt-0.5">
            {m.codigo}
          </p>
        )}
      </td>

      {/* Modelo */}
      <td className="px-3 py-3 align-top min-w-[180px]">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {m.marca} {m.nombre}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
          <span
            className={`inline-block size-1.5 rounded-full ${
              m.condicion === "0KM" ? "bg-emerald-500" : "bg-orange-500"
            }`}
          />
          {m.condicion}
          {" · "}
          {ORIGEN_LABEL[m.origen] || m.origen}
        </p>
      </td>

      {/* Año / Km */}
      <td className="px-3 py-3 align-top whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
        <p>{m.anio || "—"}</p>
        {m.kilometros != null && (
          <p className="text-gray-400 mt-0.5">
            {m.kilometros.toLocaleString("es-AR")} km
          </p>
        )}
      </td>

      {/* Patente */}
      <td className="px-3 py-3 align-top whitespace-nowrap font-mono text-[11px] text-gray-700 dark:text-gray-300">
        {m.patente || <span className="text-gray-300">—</span>}
      </td>

      {/* Dueño / Referencia */}
      <td className="px-3 py-3 align-top text-xs min-w-[170px]">
        {m.dueno ? (
          <>
            <Link
              href={`/admin/clientes/${m.dueno.clienteId}`}
              className="font-medium text-gray-900 dark:text-gray-100 hover:text-[#6B4F7A] hover:underline"
            >
              {m.dueno.nombre}
            </Link>
            <div className="mt-0.5 flex items-center gap-1 flex-wrap">
              {m.dueno.tipo === "MANDATO" && m.dueno.mandatoId && (
                <Link
                  href={`/admin/mandatos/${m.dueno.mandatoId}`}
                  className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded font-mono hover:underline"
                >
                  MV-{String(m.dueno.mandatoNumero).padStart(4, "0")}
                </Link>
              )}
              {m.dueno.tipo === "PERMUTA" && m.dueno.ocNumero && (
                <Link
                  href={`/admin/ordenes-compra/${m.dueno.ocId}`}
                  className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded font-mono hover:underline"
                >
                  OC-{String(m.dueno.ocNumero).padStart(4, "0")}
                </Link>
              )}
              {m.dueno.tipo === "PERMUTA" && !m.dueno.ocNumero && (
                <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded">
                  Permuta
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Compra / Toma */}
      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
        {m.precioCompra ? (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatMoney(m.precioCompra.monto, m.precioCompra.moneda)}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Precio venta (lista en catalogo, o precio real de la OC si ya se vendio) */}
      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
        {m.ocVenta ? (
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {formatMoney(m.ocVenta.precioVenta, m.ocVenta.moneda)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Vendida {new Date(m.ocVenta.fecha).toLocaleDateString("es-AR")}
            </p>
          </div>
        ) : m.precio ? (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatMoney(m.precio, m.moneda)}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">Consultar</span>
        )}
      </td>

      {/* Estado */}
      <td className="px-3 py-3 align-top whitespace-nowrap">
        <EstadoPill estado={m.estado} />
      </td>

      {/* Acciones */}
      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          {m.ocVenta && (
            <Link
              href={`/admin/ordenes-compra/${m.ocVenta.id}`}
              title={`Ver OC-${String(m.ocVenta.numero).padStart(4, "0")}`}
              className="inline-flex items-center gap-0.5 text-[11px] text-blue-700 dark:text-blue-300 hover:underline px-1.5"
            >
              <FileText className="size-3" />
              OC-{String(m.ocVenta.numero).padStart(4, "0")}
            </Link>
          )}
          <Link
            href={`/admin/modelos/${m.id}`}
            title="Editar datos completos en catálogo"
            className="inline-flex items-center gap-1 text-xs text-[#6B4F7A] hover:underline px-1.5"
          >
            <ExternalLink className="size-3" />
            Ficha
          </Link>
        </div>
      </td>
    </tr>
  )
}

function EstadoPill({ estado }: { estado: StockMotoUI["estado"] }) {
  if (estado === "EN_STOCK") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
        En stock
      </span>
    )
  }
  if (estado === "RESERVADA") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-[11px] font-medium">
        Reservada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 text-[11px] font-medium">
      Vendida
    </span>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: "emerald" | "teal" | "purple" | "gray"
  hint?: string | null
}) {
  const colors: Record<typeof color, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    teal: "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-[#6B4F7A] dark:text-purple-300",
    gray: "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300",
  }
  return (
    <div className="rounded-xl border bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
            {label}
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
            {value}
          </p>
          {hint && (
            <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Formatea totales mixtos ARS + USD compactos para los cards
function formatPriceMix(ars: number, usd: number): string {
  if (ars === 0 && usd === 0) return "$ 0"
  const partes: string[] = []
  if (usd > 0) partes.push(`USD ${usd.toLocaleString("es-AR")}`)
  if (ars > 0) partes.push(`$ ${ars.toLocaleString("es-AR")}`)
  return partes.join(" + ")
}

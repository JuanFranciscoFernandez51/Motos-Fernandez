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
  Pencil,
  ShoppingCart,
  Archive,
  Undo2,
  Loader2,
} from "lucide-react"
import { formatMoney } from "@/lib/admin-helpers"
import { EditStockModal } from "./edit-stock-modal"
import type { ClienteOption } from "@/components/admin/operativo/cliente-selector"
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
  valorToma: number | null
  valorTomaMoneda: string | null
  activo: boolean
  vendida: boolean
  fechaVenta: string | null
  archivada: boolean
  fechaArchivada: string | null
  motivoArchivada: string | null
  etiqueta: string | null
  origen: string | null
  proveedor: string | null
  clienteEntrega: string | null
  clienteEntregaId: string | null
  clienteTelefono: string | null
  ocVentaNumero: number | null
  ocVentaId: string | null
  fotoPrincipal: string | null
  createdAt: string
  // Tenencia: dónde está físicamente la moto + info del mandato si aplica
  tipoTenencia: string // "EN_LOCAL" | "EN_DOMICILIO"
  direccionTenencia: string | null
  mandatoId: string | null
  mandatoNumero: number | null
  mandatoEstado: string | null
  mandatoFechaFirma: string | null
  mandatoVencimiento: string | null
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

type Filtro = "DISPONIBLES" | "VENDIDAS" | "ARCHIVADAS" | "TODAS"
type Tenencia = "EN_LOCAL" | "EN_DOMICILIO" | "TODAS"

export function StockMotosClient({
  motos,
  clientes,
}: {
  motos: StockMotoUI[]
  clientes: ClienteOption[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("DISPONIBLES")
  const [condicion, setCondicion] = useState<"TODAS" | "0KM" | "USADA">("TODAS")
  const [origenFiltro, setOrigenFiltro] = useState<string>("TODOS")
  // Default EN_LOCAL para que el operador siga viendo primero el stock físico
  // (lo que tenemos en la conce). Las EN_DOMICILIO se muestran activando
  // el tab correspondiente.
  const [tenencia, setTenencia] = useState<Tenencia>("EN_LOCAL")
  const [showNuevaModal, setShowNuevaModal] = useState(false)
  // Modal de edicion rapida (campos administrativos: chasis, motor, etc)
  const [editando, setEditando] = useState<StockMotoUI | null>(null)
  // Acciones rapidas en la fila (vender / archivar / reactivar)
  const [accionLoading, setAccionLoading] = useState<string | null>(null)

  const ejecutarAccion = async (
    moto: StockMotoUI,
    accion: "vender" | "archivar" | "desarchivar" | "reactivar",
    motivo?: string
  ) => {
    setAccionLoading(moto.id)
    try {
      const res = await fetch(`/api/admin/stock-motos/${moto.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, motivo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || `Error ${res.status}`)
        return
      }
      router.refresh()
    } finally {
      setAccionLoading(null)
    }
  }

  // Publicar / despublicar a Disponibles desde la lista (toggle inline).
  const togglePublicar = async (moto: StockMotoUI) => {
    setAccionLoading(moto.id)
    try {
      const res = await fetch(`/api/admin/stock-motos/${moto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !moto.activo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || `Error ${res.status}`)
        return
      }
      router.refresh()
    } finally {
      setAccionLoading(null)
    }
  }

  // Para los contadores aplicamos el filtro de tenencia (lo que estás viendo
  // ahora), pero la fila "total/disponibles" del header sigue dependiendo
  // del tab visible — así si filtrás "en domicilio" ves los conteos de
  // mandatos externos, no los del local mezclados.
  const motosVisibles = useMemo(() => {
    if (tenencia === "TODAS") return motos
    return motos.filter((m) => (m.tipoTenencia || "EN_LOCAL") === tenencia)
  }, [motos, tenencia])

  const counts = useMemo(
    () => ({
      total: motosVisibles.length,
      disponibles: motosVisibles.filter((m) => !m.vendida && !m.archivada).length,
      vendidas: motosVisibles.filter((m) => m.vendida).length,
      archivadas: motosVisibles.filter((m) => m.archivada && !m.vendida).length,
      cero: motosVisibles.filter((m) => !m.vendida && !m.archivada && m.condicion === "0KM").length,
      usadas: motosVisibles.filter((m) => !m.vendida && !m.archivada && m.condicion === "USADA").length,
    }),
    [motosVisibles]
  )

  // Contadores generales de tenencia (sirven para los tabs, independientes
  // del estado vendida/archivada).
  const tenenciaCounts = useMemo(
    () => ({
      enLocal: motos.filter((m) => (m.tipoTenencia || "EN_LOCAL") === "EN_LOCAL").length,
      enDomicilio: motos.filter((m) => m.tipoTenencia === "EN_DOMICILIO").length,
      todas: motos.length,
    }),
    [motos]
  )

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    return motosVisibles.filter((m) => {
      if (filtro === "DISPONIBLES" && (m.vendida || m.archivada)) return false
      if (filtro === "VENDIDAS" && !m.vendida) return false
      if (filtro === "ARCHIVADAS" && (!m.archivada || m.vendida)) return false
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
        m.direccionTenencia,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [motosVisibles, query, filtro, condicion, origenFiltro])

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

      {/* Tabs de tenencia: separa el stock físico de las consignaciones en
          domicilio. Default "En el local" (las motos físicas). El operador
          cambia a "En domicilio" para ver lo que está en lo del titular,
          con los datos a mano para armar una OC. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-neutral-800 pb-3">
        <button
          onClick={() => setTenencia("EN_LOCAL")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tenencia === "EN_LOCAL"
              ? "bg-[#6B4F7A] text-white"
              : "border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 hover:border-[#6B4F7A]"
          }`}
        >
          📍 En la concesionaria ({tenenciaCounts.enLocal})
        </button>
        <button
          onClick={() => setTenencia("EN_DOMICILIO")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tenencia === "EN_DOMICILIO"
              ? "bg-blue-600 text-white"
              : "border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 hover:border-blue-600"
          }`}
        >
          🏠 En domicilio (solo web) ({tenenciaCounts.enDomicilio})
        </button>
        <button
          onClick={() => setTenencia("TODAS")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tenencia === "TODAS"
              ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
              : "border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 hover:border-gray-700"
          }`}
        >
          Todas ({tenenciaCounts.todas})
        </button>
        {tenencia === "EN_DOMICILIO" && (
          <p className="text-[11px] text-blue-700 dark:text-blue-300 ml-2 italic">
            Las motos en domicilio se publican en la web pero no las tenemos
            físicamente. Usá esta vista para armar la OC con los datos del
            titular.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
          onClick={() => setFiltro("ARCHIVADAS")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            filtro === "ARCHIVADAS"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800"
          }`}
          title="Motos que el cliente retiró o se dieron de baja"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Archivadas</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {counts.archivadas}
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
                      onDoubleClick={() => setEditando(m)}
                      className="border-t border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/50 cursor-pointer select-none"
                      title="Doble click para editar datos administrativos"
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {m.marca} {m.nombre}
                              </p>
                              {m.tipoTenencia === "EN_DOMICILIO" && (
                                <span
                                  className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap"
                                  title="Moto en domicilio del titular — solo se publica por la web"
                                >
                                  🏠 SOLO WEB
                                </span>
                              )}
                            </div>
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
                            {m.tipoTenencia === "EN_DOMICILIO" &&
                              m.direccionTenencia && (
                                <p
                                  className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5 truncate max-w-[220px]"
                                  title={m.direccionTenencia}
                                >
                                  📍 {m.direccionTenencia}
                                </p>
                              )}
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
                          <span className="text-amber-600 dark:text-amber-400 font-medium">A completar</span>
                        )}
                        {m.valorToma != null && (
                          <p
                            className="text-[10px] text-purple-500 dark:text-purple-300 mt-0.5"
                            title="Valor de toma (interno, no se publica)"
                          >
                            Toma: {formatMoney(m.valorToma, m.valorTomaMoneda || m.moneda)}
                          </p>
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
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">
                            de {m.clienteEntrega}
                          </p>
                        )}
                        {m.clienteTelefono && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            tel: {m.clienteTelefono}
                          </p>
                        )}
                        {m.mandatoNumero != null && (
                          <a
                            href={`/admin/mandatos/${m.mandatoId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-[#6B4F7A] hover:underline mt-0.5 inline-block"
                          >
                            Mandato MV-{String(m.mandatoNumero).padStart(4, "0")}
                          </a>
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
                        ) : (
                          <button
                            type="button"
                            disabled={accionLoading === m.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePublicar(m)
                            }}
                            title={
                              m.activo
                                ? "Publicada en Disponibles — tocá para despublicar"
                                : "Sin publicar — tocá para publicar a Disponibles"
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition-colors disabled:opacity-50 ${
                              m.activo
                                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                            }`}
                          >
                            {accionLoading === m.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : m.activo ? (
                              <CheckCircle2 className="size-3" />
                            ) : (
                              <AlertCircle className="size-3" />
                            )}
                            {m.activo ? "Disponible" : "Sin publicar"}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                          {m.ocVentaId && (
                            <Link
                              href={`/admin/ordenes-compra/${m.ocVentaId}`}
                              title={`Ver OC-${String(m.ocVentaNumero).padStart(4, "0")}`}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-300 hover:underline px-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="size-3" />
                              OC-{String(m.ocVentaNumero).padStart(4, "0")}
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditando(m)
                            }}
                            className="inline-flex items-center gap-1 text-xs text-[#6B4F7A] hover:underline px-1.5"
                            title="Editar datos administrativos"
                          >
                            <Pencil className="size-3" />
                            Editar
                          </button>

                          {/* Acciones según estado actual */}
                          {!m.vendida && !m.archivada && (
                            <>
                              <button
                                type="button"
                                disabled={accionLoading === m.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (
                                    confirm(
                                      `¿Marcar como VENDIDA la ${m.marca} ${m.nombre}?\n\nLa moto sale del stock y, si tiene mandato, pasa a VENDIDO.\nAcordate de armar la OC despues si todavia no la hiciste.`
                                    )
                                  ) {
                                    ejecutarAccion(m, "vender")
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:underline px-1.5 disabled:opacity-50"
                                title="Marcar como vendida (sin OC formal)"
                              >
                                {accionLoading === m.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <ShoppingCart className="size-3" />
                                )}
                                Vender
                              </button>
                              <button
                                type="button"
                                disabled={accionLoading === m.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const motivo = prompt(
                                    `¿Por qué archivás la ${m.marca} ${m.nombre}?\n\nEjemplos: "Cliente retiró", "Devuelta a proveedor", "No vendible".\n\nLa moto sale del stock pero queda registrada.`
                                  )
                                  if (motivo === null) return
                                  ejecutarAccion(m, "archivar", motivo)
                                }}
                                className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline px-1.5 disabled:opacity-50"
                                title="Cliente la retiró o se da de baja sin venta"
                              >
                                <Archive className="size-3" />
                                Archivar
                              </button>
                            </>
                          )}
                          {m.archivada && !m.vendida && (
                            <button
                              type="button"
                              disabled={accionLoading === m.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                ejecutarAccion(m, "desarchivar")
                              }}
                              className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline px-1.5 disabled:opacity-50"
                              title="Volver al stock disponible"
                            >
                              <Undo2 className="size-3" />
                              Desarchivar
                            </button>
                          )}
                          {m.vendida && (
                            <button
                              type="button"
                              disabled={accionLoading === m.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (
                                  confirm(
                                    `¿Reactivar la ${m.marca} ${m.nombre}?\n\nVuelve al stock como disponible y desvincula la OC de venta.`
                                  )
                                ) {
                                  ejecutarAccion(m, "reactivar")
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:underline px-1.5 disabled:opacity-50"
                              title="Volver al stock (si te equivocaste al marcar vendida)"
                            >
                              <Undo2 className="size-3" />
                              Reactivar
                            </button>
                          )}

                          <Link
                            href={`/admin/modelos/${m.id}?volver=stock`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:underline px-1.5"
                            title="Ver ficha completa (fotos, descripción, etc.)"
                          >
                            <Eye className="size-3" />
                            Ficha
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
          router.refresh()
        }}
      />

      {/* Modal de edicion rapida (campos administrativos) — abre con doble
          click en la fila o boton "Editar". Para fotos / descripcion / SEO
          el admin va a "Ficha" que sigue llevando al form completo. */}
      <EditStockModal
        open={!!editando}
        moto={editando}
        clientes={clientes}
        onClose={() => setEditando(null)}
        onSaved={() => {
          setEditando(null)
          router.refresh()
        }}
      />
    </div>
  )
}

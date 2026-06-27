"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice, CATEGORIA_VEHICULO_LABELS, ETIQUETAS_MODELO } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pencil,
  Search,
  Eye,
  ImageOff,
  X,
  Camera,
  ShoppingCart,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Send,
  Loader2,
} from "lucide-react"
import { FotosModal } from "./fotos-modal"
import { DeleteModal } from "./delete-modal"
import {
  InlineTextCell,
  InlineNumberCell,
  InlineSelectCell,
} from "@/components/admin/inline-cell"
import { OCDrawer } from "@/components/admin/operativo/oc-drawer"
import type { ClienteOption } from "@/components/admin/operativo/cliente-selector"

type Modelo = {
  id: string
  nombre: string
  slug: string
  codigo: string | null
  marca: string
  categoriaVehiculo: string
  condicion: string
  anio: number | null
  kilometros: number | null
  precio: number | null
  moneda: string
  fotos: string[]
  activo: boolean
  orden: number
  cilindrada: string | null
  vendida: boolean
  fechaVenta: Date | null
  etiqueta: string | null
  proveedorId: string | null
  origen: string | null
  clienteEntregaId: string | null
}

// Detecta si una moto recibida en parte de pago está incompleta (sin foto real, sin precio, etc.)
function faltaInfoPartePago(m: Modelo): string | null {
  if (m.origen !== "PARTE_DE_PAGO") return null
  const faltantes: string[] = []
  const tienePlaceholderOSinFoto =
    m.fotos.length === 0 ||
    (m.fotos.length === 1 && m.fotos[0] === PLACEHOLDER)
  if (tienePlaceholderOSinFoto) faltantes.push("fotos")
  if (m.precio == null) faltantes.push("precio")
  if (!m.kilometros) faltantes.push("km")
  if (!m.anio) faltantes.push("año")
  if (faltantes.length === 0) return null
  return `Falta: ${faltantes.join(", ")}`
}

type ProveedorOpt = { id: string; nombre: string }

const PLACEHOLDER = "/images/logo-clasico.png"

type Filter = "todas" | "activas" | "inactivas" | "sin-foto" | "con-placeholder"

export function ModelosList({
  modelos,
  proveedores,
  clientes,
  toggleActivo,
  updateFotos,
  updateEtiqueta,
  updateCampoModelo,
  updateProveedorModelo,
  markVendida,
  crearOCDesdeModelo,
  deleteModelo,
}: {
  modelos: Modelo[]
  proveedores: ProveedorOpt[]
  clientes: ClienteOption[]
  toggleActivo: (id: string, activoActual: boolean) => Promise<void>
  updateFotos: (id: string, fotos: string[]) => Promise<void>
  updateEtiqueta: (id: string, etiqueta: string | null) => Promise<void>
  updateCampoModelo: (
    id: string,
    field: string,
    value: string | number | null
  ) => Promise<void>
  updateProveedorModelo: (id: string, proveedorId: string | null) => Promise<void>
  markVendida: (id: string, vendida: boolean) => Promise<void>
  crearOCDesdeModelo: (input: Parameters<
    NonNullable<React.ComponentProps<typeof OCDrawer>["crearOCDesdeModelo"]>
  >[0]) => Promise<{
    error?: string
    ordenId?: string
    motoRecibidaId?: string | null
  }>
  deleteModelo: (id: string, confirmText: string) => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("todas")
  const [isPending, startTransition] = useTransition()
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set())
  const [fotosModeloId, setFotosModeloId] = useState<string | null>(null)
  const [deleteModeloId, setDeleteModeloId] = useState<string | null>(null)
  const [vendidasOpen, setVendidasOpen] = useState(false)
  const [queryVendidas, setQueryVendidas] = useState("")
  const [ocDrawerModeloId, setOCDrawerModeloId] = useState<string | null>(null)
  const [republicandoId, setRepublicandoId] = useState<string | null>(null)

  // Republica una moto en Instagram + Facebook (fuerza aunque ya esté publicada).
  const handleRepublicar = async (id: string, nombre: string) => {
    if (republicandoId) return
    setRepublicandoId(id)
    try {
      const res = await fetch(`/api/admin/meta/publish/${id}?force=1`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        const redes = [data.igPostId && "Instagram", data.fbPostId && "Facebook"]
          .filter(Boolean)
          .join(" + ")
        window.alert(`✅ "${nombre}" republicada en ${redes || "Meta"}.`)
      } else {
        window.alert(`❌ No se pudo republicar: ${data.error || `Error ${res.status}`}`)
      }
    } catch (e) {
      window.alert(`❌ Error de red: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRepublicandoId(null)
    }
  }

  // Separamos activas (no vendidas) y vendidas
  const modelosActivas = useMemo(
    () => modelos.filter((m) => !m.vendida),
    [modelos]
  )
  const modelosVendidas = useMemo(
    () => modelos.filter((m) => m.vendida),
    [modelos]
  )

  const marcas = useMemo(
    () =>
      Array.from(new Set(modelosActivas.map((m) => m.marca))).sort(),
    [modelosActivas]
  )
  const [marcaFilter, setMarcaFilter] = useState<string>("")

  const counts = useMemo(
    () => ({
      total: modelosActivas.length,
      activas: modelosActivas.filter((m) => m.activo).length,
      inactivas: modelosActivas.filter((m) => !m.activo).length,
      sinFoto: modelosActivas.filter((m) => m.fotos.length === 0).length,
      conPlaceholder: modelosActivas.filter(
        (m) => m.fotos.length === 1 && m.fotos[0] === PLACEHOLDER
      ).length,
      vendidas: modelosVendidas.length,
    }),
    [modelosActivas, modelosVendidas]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return modelosActivas.filter((m) => {
      if (marcaFilter && m.marca !== marcaFilter) return false
      if (filter === "activas" && !m.activo) return false
      if (filter === "inactivas" && m.activo) return false
      if (filter === "sin-foto" && m.fotos.length > 0) return false
      if (
        filter === "con-placeholder" &&
        !(m.fotos.length === 1 && m.fotos[0] === PLACEHOLDER)
      )
        return false
      if (!q) return true
      const hay = [
        m.nombre,
        m.marca,
        m.slug,
        m.codigo,
        m.cilindrada,
        m.anio?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [modelosActivas, query, filter, marcaFilter])

  const filteredVendidas = useMemo(() => {
    const q = queryVendidas.trim().toLowerCase()
    if (!q) return modelosVendidas
    return modelosVendidas.filter((m) => {
      const hay = [m.nombre, m.marca, m.slug, m.codigo, m.anio?.toString()]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [modelosVendidas, queryVendidas])

  const handleToggleActivo = (id: string, activoActual: boolean) => {
    setOptimisticIds((prev) => new Set(prev).add(id))
    startTransition(async () => {
      await toggleActivo(id, activoActual)
      setOptimisticIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  }

  // Abrir drawer "Generar OC" para vender desde el catálogo
  const handleAbrirOCDrawer = (id: string) => {
    setOCDrawerModeloId(id)
  }

  // Solo se usa para "Devolver al catálogo" desde la sección Motos vendidas
  const handleDevolverACatalogo = (id: string) => {
    const modelo = modelos.find((m) => m.id === id)
    if (!modelo) return
    if (!window.confirm(`¿Devolver "${modelo.nombre}" al catálogo (dejar de estar vendida)?`)) return
    startTransition(async () => {
      await markVendida(id, false)
    })
  }

  const ocDrawerModelo = ocDrawerModeloId
    ? modelos.find((m) => m.id === ocDrawerModeloId) ?? null
    : null

  const deleteModelo_ = modelos.find((m) => m.id === deleteModeloId) ?? null

  return (
    <div className="space-y-8">
      {/* ===== SECCIÓN: MOTOS EN CATÁLOGO ===== */}
      <div className="space-y-4">
        {/* Contadores rápidos */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <button
            onClick={() => setFilter("todas")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "todas"
                ? "border-[#7C3AED] bg-[#7C3AED]/5"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{counts.total}</p>
          </button>
          <button
            onClick={() => setFilter("activas")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "activas"
                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Activas</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{counts.activas}</p>
          </button>
          <button
            onClick={() => setFilter("inactivas")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "inactivas"
                ? "border-gray-400 bg-gray-100 dark:bg-neutral-800"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Inactivas</p>
            <p className="text-xl font-bold text-gray-600 dark:text-gray-300">
              {counts.inactivas}
            </p>
          </button>
          <button
            onClick={() => setFilter("con-placeholder")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "con-placeholder"
                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Falta foto real</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-300">
              {counts.conPlaceholder}
            </p>
          </button>
          <button
            onClick={() => setFilter("sin-foto")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "sin-foto"
                ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Sin foto</p>
            <p className="text-xl font-bold text-red-600">{counts.sinFoto}</p>
          </button>
        </div>

        {/* Buscador + filtro por marca */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, marca, código (mf001)..."
              className="pl-9"
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
            value={marcaFilter}
            onChange={(e) => setMarcaFilter(e.target.value)}
            className="h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
          >
            <option value="">Todas las marcas</option>
            {marcas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {filtered.length} / {modelosActivas.length}
          </p>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead className="w-20">Foto</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Condición</TableHead>
                <TableHead>Km</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="w-40">Etiqueta</TableHead>
                <TableHead className="w-44">Proveedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-44">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    No hay resultados
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((modelo) => {
                  const isPlaceholder =
                    modelo.fotos.length === 1 &&
                    modelo.fotos[0] === PLACEHOLDER
                  const sinFoto = modelo.fotos.length === 0
                  const pendingThis = optimisticIds.has(modelo.id)
                  const shownActivo = pendingThis
                    ? !modelo.activo
                    : modelo.activo

                  return (
                    <TableRow
                      key={modelo.id}
                      className={isPlaceholder ? "bg-orange-50/40 dark:bg-orange-950/30" : undefined}
                    >
                      <TableCell className="font-mono text-xs uppercase text-[#7C3AED] font-semibold">
                        {modelo.codigo || modelo.slug}
                      </TableCell>
                      <TableCell>
                        {sinFoto ? (
                          <div className="h-12 w-12 rounded bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-400">
                            <ImageOff className="size-5" />
                          </div>
                        ) : (
                          <div className="relative">
                            <Image
                              src={modelo.fotos[0]}
                              alt={modelo.nombre}
                              width={48}
                              height={48}
                              className="rounded object-cover h-12 w-12"
                            />
                            {isPlaceholder && (
                              <span
                                title="Es el logo placeholder — falta foto real"
                                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white"
                              >
                                !
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <InlineTextCell
                          value={modelo.nombre}
                          onSave={(v) =>
                            updateCampoModelo(modelo.id, "nombre", v)
                          }
                          display={
                            <span className="font-medium text-sm">
                              {modelo.nombre}
                            </span>
                          }
                        />
                        <div className="flex items-center gap-1.5 mt-0.5 px-1 flex-wrap">
                          <p className="text-xs text-gray-400">
                            {[modelo.cilindrada, modelo.anio]
                              .filter(Boolean)
                              .join(" · ") ||
                              CATEGORIA_VEHICULO_LABELS[
                                modelo.categoriaVehiculo as keyof typeof CATEGORIA_VEHICULO_LABELS
                              ]}
                          </p>
                          {modelo.origen === "PARTE_DE_PAGO" && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] py-0 px-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                              title="Esta moto ingresó como parte de pago"
                            >
                              🔄 Parte de pago
                            </Badge>
                          )}
                          {(() => {
                            const falta = faltaInfoPartePago(modelo)
                            return falta ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] py-0 px-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 animate-pulse"
                                title={falta}
                              >
                                ⚠️ {falta}
                              </Badge>
                            ) : null
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <InlineTextCell
                          value={modelo.marca}
                          onSave={(v) =>
                            updateCampoModelo(modelo.id, "marca", v)
                          }
                          display={
                            <Badge variant="outline">{modelo.marca}</Badge>
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <InlineSelectCell
                          value={modelo.condicion}
                          options={[
                            { value: "0KM", label: "0KM" },
                            { value: "USADA", label: "Usada" },
                          ]}
                          onSave={(v) =>
                            updateCampoModelo(modelo.id, "condicion", v)
                          }
                          renderValue={(v) => (
                            <Badge
                              variant="secondary"
                              className={
                                v === "0KM"
                                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
                                  : "bg-orange-100 dark:bg-orange-900/40 text-orange-800"
                              }
                            >
                              {v === "0KM" ? "0KM" : "Usada"}
                            </Badge>
                          )}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        <InlineNumberCell
                          value={modelo.kilometros}
                          onSave={(v) =>
                            updateCampoModelo(modelo.id, "kilometros", v)
                          }
                          placeholder={modelo.condicion === "0KM" ? "0" : ""}
                          format={(v) =>
                            v != null ? (
                              `${v.toLocaleString("es-AR")} km`
                            ) : modelo.condicion === "0KM" ? (
                              "0 km"
                            ) : (
                              <span className="text-gray-400">—</span>
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <select
                            value={modelo.moneda || "ARS"}
                            onChange={(e) =>
                              startTransition(() =>
                                updateCampoModelo(
                                  modelo.id,
                                  "moneda",
                                  e.target.value
                                )
                              )
                            }
                            disabled={isPending}
                            className="h-7 text-xs rounded border border-transparent bg-transparent hover:border-gray-200 dark:border-neutral-800 cursor-pointer font-semibold text-[#7C3AED]"
                          >
                            <option value="ARS">$</option>
                            <option value="USD">USD</option>
                          </select>
                          <InlineNumberCell
                            value={modelo.precio}
                            onSave={(v) =>
                              updateCampoModelo(modelo.id, "precio", v)
                            }
                            placeholder="Consultar"
                            format={(v) =>
                              v != null ? (
                                v.toLocaleString("es-AR")
                              ) : (
                                <span className="text-gray-400 italic text-xs">
                                  Consultar
                                </span>
                              )
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={modelo.etiqueta || ""}
                          onChange={(e) =>
                            startTransition(() =>
                              updateEtiqueta(modelo.id, e.target.value || null)
                            )
                          }
                          disabled={isPending}
                          className="h-8 w-full rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-xs"
                        >
                          <option value="">Sin etiqueta</option>
                          {ETIQUETAS_MODELO.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        {modelo.condicion === "0KM" ? (
                          <select
                            value={modelo.proveedorId || ""}
                            onChange={(e) =>
                              startTransition(() =>
                                updateProveedorModelo(
                                  modelo.id,
                                  e.target.value || null
                                )
                              )
                            }
                            disabled={isPending}
                            className="h-8 w-full rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-xs"
                          >
                            <option value="">— Sin proveedor —</option>
                            {proveedores.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-400 italic px-2">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            handleToggleActivo(modelo.id, modelo.activo)
                          }
                          disabled={isPending}
                        >
                          <Badge
                            variant="secondary"
                            className={
                              shownActivo
                                ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 cursor-pointer"
                                : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 cursor-pointer"
                            }
                          >
                            {shownActivo ? "Activo" : "Inactivo"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFotosModeloId(modelo.id)}
                            title="Cargar/editar fotos"
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            render={
                              <Link href={`/admin/modelos/${modelo.id}`} />
                            }
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            render={
                              <Link
                                href={`/catalogo/${modelo.slug}`}
                                target="_blank"
                              />
                            }
                            title="Ver en el sitio"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRepublicar(modelo.id, modelo.nombre)
                            }
                            disabled={republicandoId === modelo.id}
                            title="Republicar en Instagram + Facebook"
                            className="text-[#7C3AED] hover:text-[#9D5CF0] hover:bg-[#7C3AED]/10"
                          >
                            {republicandoId === modelo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirOCDrawer(modelo.id)}
                            title="Generar Orden de Compra (vender)"
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:bg-emerald-950/30"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteModeloId(modelo.id)}
                            title="Eliminar definitivamente"
                            className="text-red-600 hover:text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ===== SECCIÓN: MOTOS VENDIDAS (colapsable) ===== */}
      <div className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <button
          onClick={() => setVendidasOpen(!vendidasOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
        >
          <div className="flex items-center gap-3">
            {vendidasOpen ? (
              <ChevronDown className="size-5 text-gray-400" />
            ) : (
              <ChevronRight className="size-5 text-gray-400" />
            )}
            <ShoppingCart className="size-5 text-emerald-600" />
            <div className="text-left">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Motos vendidas
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Histórico de unidades vendidas
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
          >
            {counts.vendidas}
          </Badge>
        </button>

        {vendidasOpen && (
          <div className="border-t border-gray-100 dark:border-neutral-800 p-5 space-y-4">
            {modelosVendidas.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Todavía no marcaste ninguna moto como vendida.
              </p>
            ) : (
              <>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={queryVendidas}
                    onChange={(e) => setQueryVendidas(e.target.value)}
                    placeholder="Buscar en vendidas..."
                    className="pl-9"
                  />
                </div>
                <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Código</TableHead>
                        <TableHead className="w-16">Foto</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Precio venta</TableHead>
                        <TableHead>Fecha venta</TableHead>
                        <TableHead className="w-40">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendidas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-6 text-gray-500 dark:text-gray-400"
                          >
                            Sin resultados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVendidas.map((modelo) => (
                          <TableRow key={modelo.id}>
                            <TableCell className="font-mono text-xs uppercase text-[#7C3AED] font-semibold">
                              {modelo.codigo || modelo.slug}
                            </TableCell>
                            <TableCell>
                              {modelo.fotos[0] ? (
                                <Image
                                  src={modelo.fotos[0]}
                                  alt={modelo.nombre}
                                  width={40}
                                  height={40}
                                  className="rounded object-cover h-10 w-10"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 dark:bg-neutral-800" />
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">
                                {modelo.nombre}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{modelo.marca}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {modelo.precio
                                ? formatPrice(modelo.precio)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500 dark:text-gray-400">
                              {modelo.fechaVenta
                                ? new Date(modelo.fechaVenta).toLocaleDateString(
                                    "es-AR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    }
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  render={
                                    <Link
                                      href={`/admin/modelos/${modelo.id}`}
                                    />
                                  }
                                  title="Ver/editar datos internos"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDevolverACatalogo(modelo.id)
                                  }
                                  title="Devolver al catálogo"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteModeloId(modelo.id)
                                  }
                                  title="Eliminar definitivamente"
                                  className="text-red-600 hover:text-red-700 dark:text-red-300 hover:bg-red-50 dark:bg-red-950/30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <FotosModal
        open={fotosModeloId !== null}
        onClose={() => setFotosModeloId(null)}
        modelo={
          fotosModeloId
            ? modelos.find((m) => m.id === fotosModeloId) ?? null
            : null
        }
        updateFotos={updateFotos}
      />

      <DeleteModal
        open={deleteModeloId !== null}
        onClose={() => setDeleteModeloId(null)}
        modelo={deleteModelo_}
        deleteModelo={deleteModelo}
      />

      <OCDrawer
        open={ocDrawerModelo !== null}
        onClose={() => setOCDrawerModeloId(null)}
        modelo={
          ocDrawerModelo
            ? {
                id: ocDrawerModelo.id,
                nombre: ocDrawerModelo.nombre,
                marca: ocDrawerModelo.marca,
                anio: ocDrawerModelo.anio,
                kilometros: ocDrawerModelo.kilometros,
                precio: ocDrawerModelo.precio,
                moneda: ocDrawerModelo.moneda,
                fotos: ocDrawerModelo.fotos,
                patente: null,
              }
            : null
        }
        clientes={clientes}
        markVendida={markVendida}
        crearOCDesdeModelo={crearOCDesdeModelo}
      />
    </div>
  )
}

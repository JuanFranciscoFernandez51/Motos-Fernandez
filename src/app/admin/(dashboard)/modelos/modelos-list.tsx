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
} from "lucide-react"
import { FotosModal } from "./fotos-modal"
import { DeleteModal } from "./delete-modal"
import {
  InlineTextCell,
  InlineNumberCell,
  InlineSelectCell,
} from "@/components/admin/inline-cell"

type Modelo = {
  id: string
  nombre: string
  slug: string
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
}

type ProveedorOpt = { id: string; nombre: string }

const PLACEHOLDER = "/images/logo-clasico.png"

type Filter = "todas" | "activas" | "inactivas" | "sin-foto" | "con-placeholder"

export function ModelosList({
  modelos,
  proveedores,
  toggleActivo,
  updateFotos,
  updateEtiqueta,
  updateCampoModelo,
  updateProveedorModelo,
  markVendida,
  deleteModelo,
}: {
  modelos: Modelo[]
  proveedores: ProveedorOpt[]
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
      const hay = [m.nombre, m.marca, m.slug, m.anio?.toString()]
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

  const handleMarkVendida = (id: string, vendida: boolean) => {
    const modelo = modelos.find((m) => m.id === id)
    if (!modelo) return
    const confirmMsg = vendida
      ? `¿Marcar "${modelo.nombre}" como VENDIDA?\n\nVa a desaparecer del catálogo público y quedar archivada en "Motos vendidas".`
      : `¿Devolver "${modelo.nombre}" al catálogo (dejar de estar vendida)?`
    if (!window.confirm(confirmMsg)) return
    startTransition(async () => {
      await markVendida(id, vendida)
    })
  }

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
                ? "border-[#6B4F7A] bg-[#6B4F7A]/5"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-xl font-bold text-gray-900">{counts.total}</p>
          </button>
          <button
            onClick={() => setFilter("activas")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "activas"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase">Activas</p>
            <p className="text-xl font-bold text-green-700">{counts.activas}</p>
          </button>
          <button
            onClick={() => setFilter("inactivas")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "inactivas"
                ? "border-gray-400 bg-gray-100"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase">Inactivas</p>
            <p className="text-xl font-bold text-gray-600">
              {counts.inactivas}
            </p>
          </button>
          <button
            onClick={() => setFilter("con-placeholder")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "con-placeholder"
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase">Falta foto real</p>
            <p className="text-xl font-bold text-orange-600">
              {counts.conPlaceholder}
            </p>
          </button>
          <button
            onClick={() => setFilter("sin-foto")}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filter === "sin-foto"
                ? "border-red-500 bg-red-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="text-xs text-gray-500 uppercase">Sin foto</p>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <select
            value={marcaFilter}
            onChange={(e) => setMarcaFilter(e.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="">Todas las marcas</option>
            {marcas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 whitespace-nowrap">
            {filtered.length} / {modelosActivas.length}
          </p>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border bg-white overflow-hidden">
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
                    className="text-center py-8 text-gray-500"
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
                      className={isPlaceholder ? "bg-orange-50/40" : undefined}
                    >
                      <TableCell className="font-mono text-xs uppercase text-[#6B4F7A] font-semibold">
                        {modelo.slug}
                      </TableCell>
                      <TableCell>
                        {sinFoto ? (
                          <div className="h-12 w-12 rounded bg-red-50 flex items-center justify-center text-red-400">
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
                        <p className="text-xs text-gray-400 mt-0.5 px-1">
                          {[modelo.cilindrada, modelo.anio]
                            .filter(Boolean)
                            .join(" · ") ||
                            CATEGORIA_VEHICULO_LABELS[
                              modelo.categoriaVehiculo as keyof typeof CATEGORIA_VEHICULO_LABELS
                            ]}
                        </p>
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
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-orange-100 text-orange-800"
                              }
                            >
                              {v === "0KM" ? "0KM" : "Usada"}
                            </Badge>
                          )}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-gray-600">
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
                            className="h-7 text-xs rounded border border-transparent bg-transparent hover:border-gray-200 cursor-pointer font-semibold text-[#6B4F7A]"
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
                          className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
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
                            className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs"
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
                                ? "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
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
                              handleMarkVendida(modelo.id, true)
                            }
                            title="Marcar como vendida"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteModeloId(modelo.id)}
                            title="Eliminar definitivamente"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setVendidasOpen(!vendidasOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {vendidasOpen ? (
              <ChevronDown className="size-5 text-gray-400" />
            ) : (
              <ChevronRight className="size-5 text-gray-400" />
            )}
            <ShoppingCart className="size-5 text-emerald-600" />
            <div className="text-left">
              <h2 className="text-sm font-semibold text-gray-900">
                Motos vendidas
              </h2>
              <p className="text-xs text-gray-500">
                Histórico de unidades vendidas
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-800"
          >
            {counts.vendidas}
          </Badge>
        </button>

        {vendidasOpen && (
          <div className="border-t border-gray-100 p-5 space-y-4">
            {modelosVendidas.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
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
                <div className="rounded-lg border bg-white overflow-hidden">
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
                            className="text-center py-6 text-gray-500"
                          >
                            Sin resultados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVendidas.map((modelo) => (
                          <TableRow key={modelo.id}>
                            <TableCell className="font-mono text-xs uppercase text-[#6B4F7A] font-semibold">
                              {modelo.slug}
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
                                <div className="h-10 w-10 rounded bg-gray-100" />
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
                            <TableCell className="text-xs text-gray-500">
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
                                    handleMarkVendida(modelo.id, false)
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
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    </div>
  )
}

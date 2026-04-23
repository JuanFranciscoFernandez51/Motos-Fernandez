"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatPrice, CATEGORIA_VEHICULO_LABELS } from "@/lib/constants"
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
import { Pencil, Search, Eye, ImageOff, X } from "lucide-react"

type Modelo = {
  id: string
  nombre: string
  slug: string
  marca: string
  categoriaVehiculo: string
  condicion: string
  anio: number | null
  precio: number | null
  fotos: string[]
  activo: boolean
  orden: number
  cilindrada: string | null
}

const PLACEHOLDER = "/images/logo-clasico.png"

type Filter = "todas" | "activas" | "inactivas" | "sin-foto" | "con-placeholder"

export function ModelosList({
  modelos,
  toggleActivo,
}: {
  modelos: Modelo[]
  toggleActivo: (id: string, activoActual: boolean) => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("todas")
  const [isPending, startTransition] = useTransition()
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set())

  const marcas = useMemo(
    () => Array.from(new Set(modelos.map((m) => m.marca))).sort(),
    [modelos]
  )
  const [marcaFilter, setMarcaFilter] = useState<string>("")

  const counts = useMemo(
    () => ({
      total: modelos.length,
      activas: modelos.filter((m) => m.activo).length,
      inactivas: modelos.filter((m) => !m.activo).length,
      sinFoto: modelos.filter((m) => m.fotos.length === 0).length,
      conPlaceholder: modelos.filter(
        (m) => m.fotos.length === 1 && m.fotos[0] === PLACEHOLDER
      ).length,
    }),
    [modelos]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return modelos.filter((m) => {
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
  }, [modelos, query, filter, marcaFilter])

  const handleToggle = (id: string, activoActual: boolean) => {
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

  return (
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
          <p className="text-xl font-bold text-gray-600">{counts.inactivas}</p>
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
          {filtered.length} / {modelos.length}
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
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No hay resultados
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((modelo) => {
                const isPlaceholder =
                  modelo.fotos.length === 1 && modelo.fotos[0] === PLACEHOLDER
                const sinFoto = modelo.fotos.length === 0
                const pendingThis = optimisticIds.has(modelo.id)
                const shownActivo = pendingThis ? !modelo.activo : modelo.activo

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
                      <div>
                        <p className="font-medium text-sm">{modelo.nombre}</p>
                        <p className="text-xs text-gray-400">
                          {[modelo.cilindrada, modelo.anio]
                            .filter(Boolean)
                            .join(" · ") || CATEGORIA_VEHICULO_LABELS[modelo.categoriaVehiculo as keyof typeof CATEGORIA_VEHICULO_LABELS]}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{modelo.marca}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          modelo.condicion === "0KM"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-orange-100 text-orange-800"
                        }
                      >
                        {modelo.condicion === "0KM" ? "0KM" : "Usada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {modelo.precio ? (
                        formatPrice(modelo.precio)
                      ) : (
                        <span className="text-gray-400">Consultar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(modelo.id, modelo.activo)}
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
                      <div className="flex items-center gap-1">
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
  )
}

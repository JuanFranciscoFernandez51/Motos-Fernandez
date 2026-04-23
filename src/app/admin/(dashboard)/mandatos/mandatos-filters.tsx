"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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
import { Search, X, Pencil, FileText, CheckCircle } from "lucide-react"
import {
  formatDate,
  formatMoney,
  formatNumero,
  ESTADO_MANDATO_STYLES,
  ESTADO_MANDATO_LABELS,
} from "@/lib/admin-helpers"

type MandatoRow = {
  id: string
  numero: number
  estado: string
  marca: string
  modelo: string
  anio: number | null
  precioVenta: number
  moneda: string
  fechaFirma: Date | null
  createdAt: Date
  clienteNombre: string
  clienteDni: string | null
  publicado: boolean
}

export function MandatosListFilters({ mandatos }: { mandatos: MandatoRow[] }) {
  const [query, setQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("")

  const counts = useMemo(
    () => ({
      total: mandatos.length,
      PENDIENTE: mandatos.filter((m) => m.estado === "PENDIENTE").length,
      ACTIVO: mandatos.filter((m) => m.estado === "ACTIVO").length,
      VENDIDO: mandatos.filter((m) => m.estado === "VENDIDO").length,
    }),
    [mandatos]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mandatos.filter((m) => {
      if (estadoFilter && m.estado !== estadoFilter) return false
      if (!q) return true
      const hay = [
        formatNumero("MV", m.numero),
        m.marca,
        m.modelo,
        m.clienteNombre,
        m.clienteDni,
        m.anio?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [mandatos, query, estadoFilter])

  return (
    <div className="space-y-4">
      {/* Contadores rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setEstadoFilter("")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === ""
              ? "border-[#6B4F7A] bg-[#6B4F7A]/5"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-xs text-gray-500 uppercase">Total</p>
          <p className="text-xl font-bold text-gray-900">{counts.total}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("PENDIENTE")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "PENDIENTE"
              ? "border-yellow-500 bg-yellow-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-xs text-gray-500 uppercase">Pendientes</p>
          <p className="text-xl font-bold text-yellow-700">
            {counts.PENDIENTE}
          </p>
        </button>
        <button
          onClick={() => setEstadoFilter("ACTIVO")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "ACTIVO"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-xs text-gray-500 uppercase">Activos</p>
          <p className="text-xl font-bold text-green-700">{counts.ACTIVO}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("VENDIDO")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "VENDIDO"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-xs text-gray-500 uppercase">Vendidos</p>
          <p className="text-xl font-bold text-blue-700">{counts.VENDIDO}</p>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número, moto, cliente..."
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

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nº</TableHead>
              <TableHead>Moto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Catálogo</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-gray-500"
                >
                  {mandatos.length === 0 ? (
                    <div className="space-y-2">
                      <FileText className="size-10 mx-auto text-gray-300" />
                      <p>Todavía no cargaste ningún mandato.</p>
                    </div>
                  ) : (
                    "Sin resultados"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs font-semibold text-[#6B4F7A]">
                    {formatNumero("MV", m.numero)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">
                      {m.marca} {m.modelo}
                    </p>
                    {m.anio && (
                      <p className="text-xs text-gray-500">{m.anio}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{m.clienteNombre}</p>
                    {m.clienteDni && (
                      <p className="text-xs font-mono text-gray-500">
                        {m.clienteDni}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {formatMoney(m.precioVenta, m.moneda)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={ESTADO_MANDATO_STYLES[m.estado]}
                    >
                      {ESTADO_MANDATO_LABELS[m.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.publicado ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="size-3" /> Publicado
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {formatDate(m.fechaFirma)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/admin/mandatos/${m.id}`} />}
                        title="Ver / editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <a
                        href={`/api/pdf/mandato/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md h-9 px-2 text-sm hover:bg-gray-100"
                        title="Generar PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

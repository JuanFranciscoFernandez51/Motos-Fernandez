"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, X, Pencil, FileText, Receipt } from "lucide-react"
import {
  formatDate,
  formatMoney,
  formatNumero,
  ESTADO_OC_STYLES,
  ESTADO_OC_LABELS,
} from "@/lib/admin-helpers"
import { InlineEstadoSelect, type EstadoOption } from "@/components/admin/inline-estado-select"
import { DeleteWithConfirmButton } from "@/components/admin/delete-with-confirm-button"

const ESTADOS_OC: EstadoOption[] = ["BORRADOR", "RESERVADA", "CONCRETADA", "CANCELADA"].map(
  (v) => ({ value: v, label: ESTADO_OC_LABELS[v], className: ESTADO_OC_STYLES[v] })
)

type Row = {
  id: string
  numero: number
  estado: string
  motoDescripcion: string
  precioVenta: number
  moneda: string
  formaPago: string | null
  fecha: Date
  clienteNombre: string
  clienteDni: string | null
}

export function OCList({ ordenes }: { ordenes: Row[] }) {
  const [query, setQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("")

  const counts = useMemo(
    () => ({
      total: ordenes.length,
      BORRADOR: ordenes.filter((o) => o.estado === "BORRADOR").length,
      RESERVADA: ordenes.filter((o) => o.estado === "RESERVADA").length,
      CONCRETADA: ordenes.filter((o) => o.estado === "CONCRETADA").length,
    }),
    [ordenes]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ordenes.filter((o) => {
      if (estadoFilter && o.estado !== estadoFilter) return false
      if (!q) return true
      const hay = [
        formatNumero("OC", o.numero),
        o.motoDescripcion,
        o.clienteNombre,
        o.clienteDni,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [ordenes, query, estadoFilter])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setEstadoFilter("")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "" ? "border-[#6B4F7A] bg-[#6B4F7A]/5" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{counts.total}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("BORRADOR")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "BORRADOR" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Borrador</p>
          <p className="text-xl font-bold text-yellow-700">{counts.BORRADOR}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("RESERVADA")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "RESERVADA" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Reservadas</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{counts.RESERVADA}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("CONCRETADA")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "CONCRETADA" ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Concretadas</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{counts.CONCRETADA}</p>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número, moto, cliente..."
          className="pl-9"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nº</TableHead>
              <TableHead>Moto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-28">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {ordenes.length === 0 ? (
                    <div className="space-y-2">
                      <Receipt className="size-10 mx-auto text-gray-300" />
                      <p>Todavía no registraste ninguna orden de compra.</p>
                    </div>
                  ) : (
                    "Sin resultados"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs font-semibold text-[#6B4F7A]">
                    {formatNumero("OC", o.numero)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{o.motoDescripcion}</TableCell>
                  <TableCell>
                    <p className="text-sm">{o.clienteNombre}</p>
                    {o.clienteDni && <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{o.clienteDni}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {formatMoney(o.precioVenta, o.moneda)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 dark:text-gray-300">{o.formaPago || "—"}</TableCell>
                  <TableCell>
                    <InlineEstadoSelect
                      estadoActual={o.estado}
                      options={ESTADOS_OC}
                      patchUrl={`/api/admin/ordenes-compra/${o.id}/estado`}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.fecha)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" render={<Link href={`/admin/ordenes-compra/${o.id}`} />} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <a
                        href={`/api/pdf/orden-compra/${o.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md h-9 px-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800"
                        title="Boleto de compra-venta PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                      <DeleteWithConfirmButton
                        deleteUrl={`/api/admin/ordenes-compra/${o.id}`}
                        label={`${formatNumero("OC", o.numero)} — ${o.motoDescripcion}`}
                        confirmText={formatNumero("OC", o.numero)}
                        extraWarning="Esta acción borra también las permutas, pagos y financiación asociados."
                      />
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

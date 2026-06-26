"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Search, X, Pencil, CreditCard, HandCoins, Loader2 } from "lucide-react"
import {
  formatDate,
  formatMoney,
  formatNumero,
  diasHasta,
  ESTADO_FINANCIACION_STYLES,
  ESTADO_FINANCIACION_LABELS,
} from "@/lib/admin-helpers"

type Row = {
  id: string
  numero: number
  descripcion: string
  clienteId: string
  clienteNombre: string
  clienteTelefono: string | null
  clienteDni: string | null
  montoTotal: number
  moneda: string
  cantidadCuotas: number
  cuotasPagadas: number
  cuotasAtrasadas: number
  saldoPendiente: number
  proximaCuotaFecha: Date | null
  proximaCuotaMonto: number | null
  estado: string
  origen: string
  fechaInicio: Date
}

export function FinanciacionesList({
  rows,
  cobrarProximaCuota,
}: {
  rows: Row[]
  cobrarProximaCuota: (financiacionId: string) => Promise<void>
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("")
  const [monedaFilter, setMonedaFilter] = useState("")
  const [cobrandoId, setCobrandoId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleCobrar = (r: Row) => {
    const montoTxt = r.proximaCuotaMonto
      ? `${r.moneda === "USD" ? "USD " : "$ "}${r.proximaCuotaMonto.toLocaleString("es-AR")}`
      : ""
    if (
      !confirm(
        `Registrar el pago de la próxima cuota de ${r.clienteNombre}${montoTxt ? ` (${montoTxt})` : ""} en efectivo, con fecha de hoy?\n\nPara otro método, fecha o comprobante, entrá al detalle.`
      )
    )
      return
    setCobrandoId(r.id)
    startTransition(async () => {
      await cobrarProximaCuota(r.id)
      setCobrandoId(null)
      router.refresh()
    })
  }

  const counts = useMemo(
    () => ({
      total: rows.length,
      ACTIVA: rows.filter((r) => r.estado === "ACTIVA").length,
      ATRASADA: rows.filter((r) => r.estado === "ATRASADA").length,
      COMPLETADA: rows.filter((r) => r.estado === "COMPLETADA").length,
    }),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (estadoFilter && r.estado !== estadoFilter) return false
      if (monedaFilter && r.moneda !== monedaFilter) return false
      if (!q) return true
      const hay = [
        formatNumero("FIN", r.numero),
        r.clienteNombre,
        r.clienteDni,
        r.clienteTelefono,
        r.descripcion,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query, estadoFilter, monedaFilter])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setEstadoFilter("")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === ""
              ? "border-[#6B4F7A] bg-[#6B4F7A]/5"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{counts.total}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("ACTIVA")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "ACTIVA"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Activas</p>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{counts.ACTIVA}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("ATRASADA")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "ATRASADA"
              ? "border-red-500 bg-red-50 dark:bg-red-950/30"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Atrasadas</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-300">{counts.ATRASADA}</p>
        </button>
        <button
          onClick={() => setEstadoFilter("COMPLETADA")}
          className={`rounded-lg border p-3 text-left transition-colors ${
            estadoFilter === "COMPLETADA"
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
          }`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Completadas</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{counts.COMPLETADA}</p>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número, cliente, DNI, moto..."
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
          value={monedaFilter}
          onChange={(e) => setMonedaFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
        >
          <option value="">Todas las monedas</option>
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>

      <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Moto</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Cuotas</TableHead>
              <TableHead>Próximo venc.</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-36">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {rows.length === 0 ? (
                    <div className="space-y-2">
                      <CreditCard className="size-10 mx-auto text-gray-300" />
                      <p>Todavía no hay financiaciones cargadas.</p>
                    </div>
                  ) : (
                    "Sin resultados"
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const dias = r.proximaCuotaFecha ? diasHasta(r.proximaCuotaFecha) : null
                const isAtrasada = r.cuotasAtrasadas > 0 || (dias !== null && dias < 0)
                const isProximo = dias !== null && dias >= 0 && dias <= 7
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold text-[#6B4F7A]">
                      {formatNumero("FIN", r.numero)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{r.clienteNombre}</p>
                      {r.clienteTelefono && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{r.clienteTelefono}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.descripcion}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {formatMoney(r.montoTotal, r.moneda)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-green-700 dark:text-green-300">{r.cuotasPagadas}</span>
                      <span className="text-gray-400"> / {r.cantidadCuotas}</span>
                      {r.cuotasAtrasadas > 0 && (
                        <span className="ml-2 text-xs text-red-600 dark:text-red-300 font-semibold">
                          {r.cuotasAtrasadas} atrasada{r.cuotasAtrasadas === 1 ? "" : "s"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.proximaCuotaFecha ? (
                        <>
                          <p className={
                            isAtrasada
                              ? "text-red-600 dark:text-red-300 font-semibold"
                              : isProximo
                                ? "text-amber-600 dark:text-amber-300 font-semibold"
                                : "text-gray-700 dark:text-gray-300"
                          }>
                            {formatDate(r.proximaCuotaFecha)}
                          </p>
                          {dias !== null && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {dias < 0
                                ? `Atrasada ${Math.abs(dias)} días`
                                : dias === 0
                                  ? "Hoy"
                                  : `En ${dias} días`}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {formatMoney(r.saldoPendiente, r.moneda)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ESTADO_FINANCIACION_STYLES[r.estado]}>
                        {ESTADO_FINANCIACION_LABELS[r.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {r.proximaCuotaFecha && r.estado !== "COMPLETADA" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCobrar(r)}
                            disabled={cobrandoId === r.id}
                            title="Cobrar próxima cuota (efectivo, hoy)"
                            className="text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                          >
                            {cobrandoId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <HandCoins className="h-4 w-4" />
                            )}
                            <span className="ml-1 text-xs hidden sm:inline">Cobrar</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/admin/tesoreria/financiaciones/${r.id}`} />}
                          title="Ver detalle"
                        >
                          <Pencil className="h-4 w-4" />
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

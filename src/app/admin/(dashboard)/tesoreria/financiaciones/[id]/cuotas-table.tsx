"use client"

import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Check, X, Loader2, RotateCcw } from "lucide-react"
import {
  formatDate,
  formatMoney,
  diasHasta,
  ESTADO_CUOTA_STYLES,
  ESTADO_CUOTA_LABELS,
} from "@/lib/admin-helpers"

type Cuota = {
  id: string
  numero: number
  monto: number
  montoPagado: number
  fechaVencimiento: Date
  fechaPago: Date | null
  estado: string
  metodoPago: string | null
  observaciones: string | null
}

export function CuotasTable({
  cuotas,
  moneda,
  pagarCuota,
  desmarcarPago,
}: {
  cuotas: Cuota[]
  moneda: string
  pagarCuota: (
    id: string,
    fechaPago: string,
    metodoPago: string,
    observaciones: string,
    montoAhora?: number
  ) => Promise<void>
  desmarcarPago: (id: string) => Promise<void>
}) {
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0])
  const [metodoPago, setMetodoPago] = useState("Efectivo")
  const [observaciones, setObservaciones] = useState("")
  const [montoAhora, setMontoAhora] = useState("")
  const [isPending, startTransition] = useTransition()

  const saldoDe = (c: Cuota) => Math.max(0, c.monto - c.montoPagado)

  const handleAbrirPago = (c: Cuota) => {
    setPagandoId(c.id)
    setFechaPago(new Date().toISOString().split("T")[0])
    setMetodoPago(c.metodoPago || "Efectivo")
    setObservaciones("")
    // Prellena con el saldo restante; si pagan menos, queda parcial.
    setMontoAhora(String(saldoDe(c)))
  }

  const handleConfirmarPago = (id: string) => {
    startTransition(async () => {
      await pagarCuota(id, fechaPago, metodoPago, observaciones, Number(montoAhora) || undefined)
      setPagandoId(null)
    })
  }

  const handleDesmarcarPago = (id: string) => {
    if (!confirm("¿Desmarcar esta cuota como pagada?")) return
    startTransition(async () => {
      await desmarcarPago(id)
    })
  }

  return (
    <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Nº</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="w-32">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cuotas.map((c) => {
            const dias = diasHasta(c.fechaVencimiento)
            const isAtrasada = c.estado === "ATRASADA"
            const isProximo = c.estado === "PENDIENTE" && dias >= 0 && dias <= 7

            return (
              <>
                <TableRow
                  key={c.id}
                  className={
                    isAtrasada
                      ? "bg-red-50/50 dark:bg-red-950/20"
                      : isProximo
                        ? "bg-amber-50/30 dark:bg-amber-950/10"
                        : ""
                  }
                >
                  <TableCell className="font-mono text-xs font-bold text-[#7C3AED]">
                    #{c.numero}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{formatDate(c.fechaVencimiento)}</p>
                    {c.estado !== "PAGADA" && c.estado !== "CANCELADA" && (
                      <p className={`text-[10px] ${
                        isAtrasada
                          ? "text-red-600 dark:text-red-300 font-semibold"
                          : isProximo
                            ? "text-amber-600 dark:text-amber-300 font-semibold"
                            : "text-gray-500 dark:text-gray-400"
                      }`}>
                        {dias < 0
                          ? `Atrasada ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`
                          : dias === 0
                            ? "Vence hoy"
                            : dias === 1
                              ? "Vence mañana"
                              : `En ${dias} días`}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(c.monto, moneda)}
                    {c.montoPagado > 0 && c.estado !== "PAGADA" && (
                      <p className="text-[10px] font-normal text-blue-600 dark:text-blue-300">
                        Pagó {formatMoney(c.montoPagado, moneda)} · falta {formatMoney(saldoDe(c), moneda)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ESTADO_CUOTA_STYLES[c.estado]}>
                      {ESTADO_CUOTA_LABELS[c.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.fechaPago ? (
                      <>
                        <p className="text-gray-700 dark:text-gray-300">{formatDate(c.fechaPago)}</p>
                        {c.observaciones && (
                          <p className="text-gray-500 dark:text-gray-400 italic truncate max-w-[200px]" title={c.observaciones}>
                            {c.observaciones}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                    {c.metodoPago || "—"}
                  </TableCell>
                  <TableCell>
                    {c.estado === "PAGADA" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDesmarcarPago(c.id)}
                        disabled={isPending}
                        className="text-amber-600 dark:text-amber-300"
                        title="Desmarcar pago"
                      >
                        <RotateCcw className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAbrirPago(c)}
                        disabled={isPending}
                        className="text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                        title="Registrar pago"
                      >
                        <Check className="size-4" />
                        <span className="ml-1 text-xs">{c.estado === "PARCIAL" ? "Pagar saldo" : "Pagar"}</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>

                {/* Form expandible para registrar pago */}
                {pagandoId === c.id && (
                  <TableRow key={`${c.id}-form`}>
                    <TableCell colSpan={7} className="bg-green-50/50 dark:bg-green-950/20 p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                            Registrar pago de cuota #{c.numero}
                          </p>
                          <button
                            type="button"
                            onClick={() => setPagandoId(null)}
                            disabled={isPending}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="fechaPago">Fecha de pago</Label>
                            <Input
                              id="fechaPago"
                              type="date"
                              value={fechaPago}
                              onChange={(e) => setFechaPago(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="metodoPago">Método de pago</Label>
                            <select
                              id="metodoPago"
                              value={metodoPago}
                              onChange={(e) => setMetodoPago(e.target.value)}
                              className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                            >
                              <option value="Efectivo">Efectivo</option>
                              <option value="Transferencia">Transferencia</option>
                              <option value="Tarjeta">Tarjeta</option>
                              <option value="Cheque">Cheque</option>
                              <option value="MercadoPago">MercadoPago</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="montoAhora">Monto que paga ahora</Label>
                            <Input
                              id="montoAhora"
                              type="number"
                              value={montoAhora}
                              onChange={(e) => setMontoAhora(e.target.value)}
                            />
                            {/* El aviso de pago parcial aparece solo si paga
                                menos que el saldo de la cuota. */}
                            {Number(montoAhora) > 0 && Number(montoAhora) < saldoDe(c) ? (
                              <p className="text-[11px] text-blue-600 dark:text-blue-300 mt-1 font-medium">
                                Pago parcial: queda un saldo de{" "}
                                {formatMoney(saldoDe(c) - Number(montoAhora), moneda)} para después.
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400 mt-1">
                                Saldo de la cuota: {formatMoney(saldoDe(c), moneda)}
                              </p>
                            )}
                          </div>
                          <div className="md:col-span-3">
                            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
                            <Textarea
                              id="observaciones"
                              value={observaciones}
                              onChange={(e) => setObservaciones(e.target.value)}
                              rows={2}
                              placeholder="Nº de comprobante, notas..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPagandoId(null)}
                            disabled={isPending}
                            className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmarPago(c.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Check className="size-3" />
                            )}
                            Confirmar pago
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

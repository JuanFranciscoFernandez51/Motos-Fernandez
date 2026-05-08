"use client"

import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

// Estos métodos cubren todas las formas de pago combinables que NO son
// permutas (van en su tabla aparte) ni financiación (también aparte).
export const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA_DEBITO", label: "Tarjeta de débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta de crédito" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "DEPOSITO", label: "Depósito bancario" },
  { value: "DOLARES", label: "Dólares" },
  { value: "OTRO", label: "Otro" },
] as const

export type PagoForm = {
  id: string | null
  metodo: string
  monto: string
  detalle: string
  fecha: string // ISO YYYY-MM-DD o ""
}

export const pagoVacio = (): PagoForm => ({
  id: null,
  metodo: "EFECTIVO",
  monto: "",
  detalle: "",
  fecha: "",
})

/**
 * Editor de pagos combinables. Muestra una fila por pago con método,
 * monto y detalle libre. Permite agregar y borrar pagos. Muestra el
 * total acumulado abajo y un comparativo contra el precio de venta
 * (resta permutas/financiación que se manejan aparte).
 */
export function PagosEditor({
  pagos,
  setPagos,
  precioVenta,
  totalPermutas,
  montoFinanciado,
}: {
  pagos: PagoForm[]
  setPagos: React.Dispatch<React.SetStateAction<PagoForm[]>>
  precioVenta: number
  totalPermutas: number
  montoFinanciado: number
}) {
  const totalPagos = pagos.reduce((s, p) => {
    const n = parseInt(p.monto || "0")
    return s + (Number.isFinite(n) ? n : 0)
  }, 0)
  const totalCubierto = totalPagos + totalPermutas + montoFinanciado
  const restante = precioVenta - totalCubierto

  const update = (i: number, patch: Partial<PagoForm>) =>
    setPagos((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const remove = (i: number) =>
    setPagos((prev) => (prev.length <= 1 ? [pagoVacio()] : prev.filter((_, idx) => idx !== i)))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Podés combinar varios métodos: efectivo + transferencia + cheque, etc.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPagos((prev) => [...prev, pagoVacio()])}
        >
          <Plus className="size-3.5 mr-1" />
          Agregar pago
        </Button>
      </div>

      <div className="space-y-2">
        {pagos.map((p, i) => (
          <div
            key={p.id || `new-${i}`}
            className="grid grid-cols-1 md:grid-cols-[200px_140px_1fr_140px_auto] gap-2 items-end rounded-md border border-gray-200 dark:border-neutral-800 p-3"
          >
            <div className="space-y-1">
              <Label htmlFor={`pago-metodo-${i}`} className="text-xs">
                Método
              </Label>
              <select
                id={`pago-metodo-${i}`}
                value={p.metodo}
                onChange={(e) => update(i, { metodo: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-sm"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`pago-monto-${i}`} className="text-xs">
                Monto
              </Label>
              <Input
                id={`pago-monto-${i}`}
                type="number"
                value={p.monto}
                onChange={(e) => update(i, { monto: e.target.value })}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`pago-detalle-${i}`} className="text-xs">
                Detalle (opcional)
              </Label>
              <Input
                id={`pago-detalle-${i}`}
                value={p.detalle}
                onChange={(e) => update(i, { detalle: e.target.value })}
                placeholder="Ej: Visa 12 sin interés, Cheque 30 días, etc"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`pago-fecha-${i}`} className="text-xs">
                Fecha
              </Label>
              <Input
                id={`pago-fecha-${i}`}
                type="date"
                value={p.fecha}
                onChange={(e) => update(i, { fecha: e.target.value })}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              className="text-red-600 hover:bg-red-50 dark:bg-red-950/30"
              title="Borrar pago"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="rounded-md bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-3 space-y-1 text-sm">
        <Linea label="Total pagos directos" valor={totalPagos} />
        {totalPermutas > 0 && <Linea label="Total permutas" valor={totalPermutas} />}
        {montoFinanciado > 0 && <Linea label="Monto financiado" valor={montoFinanciado} />}
        <div className="border-t border-gray-200 dark:border-neutral-700 pt-1 mt-1" />
        <Linea label="Total cubierto" valor={totalCubierto} bold />
        <Linea label="Precio de venta" valor={precioVenta} bold />
        {precioVenta > 0 && (
          <Linea
            label={restante === 0 ? "Cuadrado ✓" : restante > 0 ? "Falta cubrir" : "Cubre de más"}
            valor={Math.abs(restante)}
            color={restante === 0 ? "text-green-700" : restante > 0 ? "text-red-700" : "text-amber-700"}
            bold
          />
        )}
      </div>
    </div>
  )
}

function Linea({
  label,
  valor,
  bold,
  color,
}: {
  label: string
  valor: number
  bold?: boolean
  color?: string
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""} ${color || ""}`}>
      <span>{label}</span>
      <span className="font-mono">${valor.toLocaleString("es-AR")}</span>
    </div>
  )
}

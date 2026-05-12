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
  moneda: string  // "ARS" | "USD"
  detalle: string
  fecha: string // ISO YYYY-MM-DD o ""
}

export const pagoVacio = (moneda: string = "ARS"): PagoForm => ({
  id: null,
  metodo: "EFECTIVO",
  monto: "",
  moneda,
  detalle: "",
  fecha: "",
})

// Etiqueta cortita por moneda para mostrar en montos
function simboloMoneda(m: string): string {
  return m === "USD" ? "USD" : "$"
}

// Tipo de cada subtotal por moneda
type Subtotal = { ARS: number; USD: number }

function emptySubtotal(): Subtotal {
  return { ARS: 0, USD: 0 }
}

function sumPagos(pagos: PagoForm[]): Subtotal {
  const acc = emptySubtotal()
  for (const p of pagos) {
    const n = parseInt(p.monto || "0")
    if (!Number.isFinite(n) || n === 0) continue
    const m = (p.moneda || "ARS") as "ARS" | "USD"
    acc[m] = (acc[m] ?? 0) + n
  }
  return acc
}

/**
 * Editor de pagos combinables. Cada pago lleva su propia moneda — el
 * resumen muestra subtotales por moneda separados (no mezclamos ARS y USD).
 *
 * `precioVenta` y `totalPermutas` / `montoFinanciado` se pasan junto con la
 * moneda principal de la OC. Si todo está en una sola moneda, el cuadre
 * se muestra como antes; si hay mezcla, mostramos la línea por moneda.
 */
export function PagosEditor({
  pagos,
  setPagos,
  precioVenta,
  monedaOC,
  totalPermutas,
  permutasPorMoneda,
  montoFinanciado,
}: {
  pagos: PagoForm[]
  setPagos: React.Dispatch<React.SetStateAction<PagoForm[]>>
  precioVenta: number
  monedaOC: string
  // Total de permutas en la moneda principal de la OC (legacy). Si vienen
  // permutas en otras monedas, se usa `permutasPorMoneda`.
  totalPermutas: number
  // Subtotales de permutas separados por moneda. Si no se pasa, se asume
  // todo en `monedaOC` por compat.
  permutasPorMoneda?: Subtotal
  montoFinanciado: number
}) {
  const totalPagos = sumPagos(pagos)

  // Subtotales por moneda: pagos + permutas + financiación
  const subPermutas = permutasPorMoneda ?? {
    ARS: monedaOC === "ARS" ? totalPermutas : 0,
    USD: monedaOC === "USD" ? totalPermutas : 0,
  }
  const subFin: Subtotal = {
    ARS: monedaOC === "ARS" ? montoFinanciado : 0,
    USD: monedaOC === "USD" ? montoFinanciado : 0,
  }

  const cubierto: Subtotal = {
    ARS: totalPagos.ARS + subPermutas.ARS + subFin.ARS,
    USD: totalPagos.USD + subPermutas.USD + subFin.USD,
  }

  // Compara contra el precio en la moneda principal de la OC
  const precioMonedaOC = monedaOC === "USD" ? cubierto.USD : cubierto.ARS
  const restante = precioVenta - precioMonedaOC

  // Hay mezcla cuando algún monto en la moneda "secundaria" (la otra) es > 0
  const monedaSecundaria = monedaOC === "USD" ? "ARS" : "USD"
  const haySecundaria =
    (cubierto as Record<string, number>)[monedaSecundaria] > 0

  const update = (i: number, patch: Partial<PagoForm>) =>
    setPagos((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const remove = (i: number) =>
    setPagos((prev) =>
      prev.length <= 1 ? [pagoVacio(monedaOC)] : prev.filter((_, idx) => idx !== i)
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Podés combinar varios métodos y monedas: efectivo en ARS + transferencia
          en USD + cheque, etc.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPagos((prev) => [...prev, pagoVacio(monedaOC)])}
        >
          <Plus className="size-3.5 mr-1" />
          Agregar pago
        </Button>
      </div>

      <div className="space-y-2">
        {pagos.map((p, i) => (
          <div
            key={p.id || `new-${i}`}
            className="grid grid-cols-1 md:grid-cols-[180px_120px_90px_1fr_130px_auto] gap-2 items-end rounded-md border border-gray-200 dark:border-neutral-800 p-3"
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
              <Label htmlFor={`pago-moneda-${i}`} className="text-xs">
                Moneda
              </Label>
              <select
                id={`pago-moneda-${i}`}
                value={p.moneda || "ARS"}
                onChange={(e) => update(i, { moneda: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-sm"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
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
        {/* Pagos directos por moneda */}
        {totalPagos.ARS > 0 && (
          <Linea label="Pagos en ARS" valor={totalPagos.ARS} moneda="ARS" />
        )}
        {totalPagos.USD > 0 && (
          <Linea label="Pagos en USD" valor={totalPagos.USD} moneda="USD" />
        )}
        {totalPagos.ARS === 0 && totalPagos.USD === 0 && (
          <Linea label="Pagos directos" valor={0} moneda={monedaOC} />
        )}

        {/* Permutas por moneda */}
        {subPermutas.ARS > 0 && (
          <Linea label="Permutas en ARS" valor={subPermutas.ARS} moneda="ARS" />
        )}
        {subPermutas.USD > 0 && (
          <Linea label="Permutas en USD" valor={subPermutas.USD} moneda="USD" />
        )}

        {/* Financiación */}
        {(subFin.ARS > 0 || subFin.USD > 0) && (
          <Linea
            label="Monto financiado"
            valor={subFin.ARS + subFin.USD}
            moneda={monedaOC}
          />
        )}

        <div className="border-t border-gray-200 dark:border-neutral-700 pt-1 mt-1" />

        {/* Cubierto en la moneda de la OC */}
        <Linea
          label={`Cubierto en ${monedaOC}`}
          valor={precioMonedaOC}
          moneda={monedaOC}
          bold
        />
        <Linea
          label={`Precio (${monedaOC})`}
          valor={precioVenta}
          moneda={monedaOC}
          bold
        />
        {precioVenta > 0 && (
          <Linea
            label={
              restante === 0
                ? "Cuadrado ✓"
                : restante > 0
                  ? `Falta cubrir (${monedaOC})`
                  : `Cubre de más (${monedaOC})`
            }
            valor={Math.abs(restante)}
            moneda={monedaOC}
            color={
              restante === 0
                ? "text-green-700"
                : restante > 0
                  ? "text-red-700"
                  : "text-amber-700"
            }
            bold
          />
        )}

        {/* Aviso si hay pagos/permutas en moneda secundaria */}
        {haySecundaria && (
          <p className="pt-2 text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
            ⚠ Hay {monedaSecundaria === "USD" ? "dólares" : "pesos"} sueltos
            (combinaste monedas). Convertilos manualmente o usá tipo de cambio
            para evaluar el cuadre total.
          </p>
        )}
      </div>
    </div>
  )
}

function Linea({
  label,
  valor,
  moneda,
  bold,
  color,
}: {
  label: string
  valor: number
  moneda: string
  bold?: boolean
  color?: string
}) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : ""} ${color || ""}`}
    >
      <span>{label}</span>
      <span className="font-mono">
        {simboloMoneda(moneda)} {valor.toLocaleString("es-AR")}
      </span>
    </div>
  )
}

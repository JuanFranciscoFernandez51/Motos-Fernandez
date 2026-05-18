"use client"

import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

// Métodos de pago combinables. Cada pago es un renglón con su monto y
// moneda. FINANCIACION es un caso especial: el monto = capital financiado,
// y el renglón se expande con cuotas/valor/entrega/garante.
export const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA_DEBITO", label: "Tarjeta de débito" },
  { value: "TARJETA_CREDITO", label: "Tarjeta de crédito" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "DEPOSITO", label: "Depósito bancario" },
  { value: "DOLARES", label: "Dólares" },
  { value: "FINANCIACION", label: "Financiación (cuotas)" },
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

/**
 * Datos del plan de financiación. Solo se usan si hay al menos un pago
 * con método FINANCIACION. El monto del pago FINANCIACION = capital
 * (= montoFinanciado). cuotas y valorCuota son el plan al cliente (puede
 * incluir intereses → cuotas * valorCuota >= capital).
 *
 * fechaPrimeraCuota (YYYY-MM-DD) controla cuándo vence la cuota 1. Las
 * demás cuotas se calculan a +1 mes cada una desde esa fecha. Si queda
 * vacía, se usa el default (mes siguiente día 10).
 */
export type FinanciacionForm = {
  cuotas: string
  valorCuota: string
  entrega: string
  fechaPrimeraCuota: string
}

export type GaranteForm = {
  nombre: string
  apellido: string
  dni: string
  telefono: string
  direccion: string
}

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
  financiacion,
  setFinanciacion,
  garante,
  setGarante,
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
  // Plan de financiacion: solo se edita cuando hay un pago FINANCIACION.
  // El monto del pago FINANCIACION = capital financiado.
  financiacion?: FinanciacionForm
  setFinanciacion?: React.Dispatch<React.SetStateAction<FinanciacionForm>>
  garante?: GaranteForm
  setGarante?: React.Dispatch<React.SetStateAction<GaranteForm>>
}) {
  const totalPagos = sumPagos(pagos)
  // Solo permitimos UN pago FINANCIACION (es 1 plan por OC). Si ya hay,
  // el nuevo renglón empieza con método EFECTIVO.
  const yaHayFinanciacion = pagos.some((p) => p.metodo === "FINANCIACION")

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
          Combiná métodos y monedas. Si la venta es a cuotas elegí
          "Financiación" y se abre el plan de pago inline.
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
        {pagos.map((p, i) => {
          const esFinanciacion = p.metodo === "FINANCIACION"
          return (
            <div
              key={p.id || `new-${i}`}
              className={`rounded-md border p-3 space-y-3 ${
                esFinanciacion
                  ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
                  : "border-gray-200 dark:border-neutral-800"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-[180px_120px_90px_1fr_130px_auto] gap-2 items-end">
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
                    {METODOS_PAGO.map((m) => {
                      // Si ya hay un FINANCIACION en la lista y este no es el
                      // que ya esta, no mostramos FINANCIACION como opcion.
                      if (
                        m.value === "FINANCIACION" &&
                        yaHayFinanciacion &&
                        !esFinanciacion
                      ) {
                        return null
                      }
                      return (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`pago-monto-${i}`} className="text-xs">
                    {esFinanciacion ? "Capital a financiar" : "Monto"}
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
                    placeholder={
                      esFinanciacion
                        ? "Ej: Plan propio, AHORA12, etc."
                        : "Ej: Visa 12 sin interés, Cheque 30 días, etc"
                    }
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

              {/* Sub-panel financiacion: solo si metodo = FINANCIACION */}
              {esFinanciacion && financiacion && setFinanciacion && (
                <FinanciacionPanel
                  capital={parseInt(p.monto || "0") || 0}
                  moneda={p.moneda || "ARS"}
                  financiacion={financiacion}
                  setFinanciacion={setFinanciacion}
                  garante={garante}
                  setGarante={setGarante}
                />
              )}
            </div>
          )
        })}
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

/**
 * Sub-panel del plan de financiacion. Se muestra cuando el metodo del
 * pago es FINANCIACION. El capital sale del monto del pago (asi viaja
 * por el editor). Aca se cargan cuotas, valor cuota, entrega, garante.
 */
function FinanciacionPanel({
  capital,
  moneda,
  financiacion,
  setFinanciacion,
  garante,
  setGarante,
}: {
  capital: number
  moneda: string
  financiacion: FinanciacionForm
  setFinanciacion: React.Dispatch<React.SetStateAction<FinanciacionForm>>
  garante?: GaranteForm
  setGarante?: React.Dispatch<React.SetStateAction<GaranteForm>>
}) {
  const fmt = (n: number) =>
    `${moneda === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`
  const cuotas = parseInt(financiacion.cuotas || "0") || 0
  const valorCuota = parseInt(financiacion.valorCuota || "0") || 0
  const entrega = parseInt(financiacion.entrega || "0") || 0
  const totalCuotas = cuotas * valorCuota
  const totalAPagar = totalCuotas + entrega
  const intereses = capital > 0 ? totalAPagar - capital : 0

  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-neutral-900 p-3 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
        Plan de cuotas
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fin-cuotas" className="text-xs">
            Cantidad de cuotas
          </Label>
          <Input
            id="fin-cuotas"
            type="number"
            value={financiacion.cuotas}
            onChange={(e) =>
              setFinanciacion((prev) => ({ ...prev, cuotas: e.target.value }))
            }
            placeholder="12"
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="fin-valor-cuota" className="text-xs">
            Valor por cuota
          </Label>
          <Input
            id="fin-valor-cuota"
            type="number"
            value={financiacion.valorCuota}
            onChange={(e) =>
              setFinanciacion((prev) => ({ ...prev, valorCuota: e.target.value }))
            }
            placeholder="150000"
            className="h-9"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Puede incluir intereses (cuotas × valor ≥ capital).
          </p>
        </div>
        <div>
          <Label htmlFor="fin-entrega" className="text-xs">
            Entrega / anticipo
          </Label>
          <Input
            id="fin-entrega"
            type="number"
            value={financiacion.entrega}
            onChange={(e) =>
              setFinanciacion((prev) => ({ ...prev, entrega: e.target.value }))
            }
            placeholder="0"
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="fin-fecha-primera" className="text-xs">
            Fecha 1ª cuota
          </Label>
          <Input
            id="fin-fecha-primera"
            type="date"
            value={financiacion.fechaPrimeraCuota}
            onChange={(e) =>
              setFinanciacion((prev) => ({
                ...prev,
                fechaPrimeraCuota: e.target.value,
              }))
            }
            className="h-9"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Si dejás vacío, vence el 10 del mes siguiente. Las demás cuotas
            son cada +1 mes.
          </p>
        </div>
      </div>

      {(cuotas > 0 || valorCuota > 0 || capital > 0) && (
        <div className="rounded-md bg-gray-50 dark:bg-neutral-900/60 border border-gray-200 dark:border-neutral-800 p-2.5 text-xs space-y-1">
          {capital > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Capital a financiar</span>
              <span className="font-mono font-semibold">{fmt(capital)}</span>
            </div>
          )}
          {entrega > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Entrega</span>
              <span className="font-mono">{fmt(entrega)}</span>
            </div>
          )}
          {cuotas > 0 && valorCuota > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                Cuotas × valor ({cuotas} × {fmt(valorCuota)})
              </span>
              <span className="font-mono">{fmt(totalCuotas)}</span>
            </div>
          )}
          {totalAPagar > 0 && (
            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-neutral-700 font-semibold">
              <span>Total a pagar (entrega + cuotas)</span>
              <span className="font-mono">{fmt(totalAPagar)}</span>
            </div>
          )}
          {capital > 0 && intereses > 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-300">
              <span>Intereses (total − capital)</span>
              <span className="font-mono font-semibold">{fmt(intereses)}</span>
            </div>
          )}
          {capital > 0 && intereses < 0 && (
            <p className="text-[10px] text-red-600 dark:text-red-300 italic">
              ⚠ El total a pagar es menor al capital. Revisá cuotas y valor.
            </p>
          )}
        </div>
      )}

      {garante && setGarante && (
        <div className="rounded-md border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 p-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Garante (opcional)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Apellido</Label>
              <Input
                value={garante.apellido}
                onChange={(e) =>
                  setGarante((g) => ({ ...g, apellido: e.target.value }))
                }
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                value={garante.nombre}
                onChange={(e) =>
                  setGarante((g) => ({ ...g, nombre: e.target.value }))
                }
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">DNI</Label>
              <Input
                value={garante.dni}
                onChange={(e) =>
                  setGarante((g) => ({
                    ...g,
                    dni: e.target.value.replace(/\D/g, ""),
                  }))
                }
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input
                value={garante.telefono}
                onChange={(e) =>
                  setGarante((g) => ({ ...g, telefono: e.target.value }))
                }
                className="h-9"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Dirección</Label>
              <Input
                value={garante.direccion}
                onChange={(e) =>
                  setGarante((g) => ({ ...g, direccion: e.target.value }))
                }
                className="h-9"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Card de balance arriba del form de OC. Muestra precio vs lo cubierto
 * (pagos + permutas + capital financiado), separado por moneda. Se
 * actualiza en vivo a medida que el admin carga datos.
 *
 * Vive en archivo propio para que el oc-form.tsx no quede inflado —
 * antes estaba inline al final del form.
 */
export function BalanceCard({
  precioVenta,
  monedaOC,
  pagosPorMoneda,
  permutasPorMoneda,
  montoFinanciado,
  formaPagoCalculada,
}: {
  precioVenta: number
  monedaOC: string
  pagosPorMoneda: { ARS: number; USD: number }
  permutasPorMoneda: { ARS: number; USD: number }
  montoFinanciado: number
  formaPagoCalculada: string
}) {
  const cubiertoARS = pagosPorMoneda.ARS + permutasPorMoneda.ARS
  const cubiertoUSD = pagosPorMoneda.USD + permutasPorMoneda.USD
  const cubiertoEnMoneda =
    monedaOC === "USD"
      ? cubiertoUSD + montoFinanciado
      : cubiertoARS + montoFinanciado
  const falta = precioVenta - cubiertoEnMoneda
  const cuadrado = falta === 0 && precioVenta > 0
  const haySecundaria =
    monedaOC === "USD"
      ? cubiertoARS > 0
      : cubiertoUSD > 0

  const fmt = (n: number, m: string) =>
    `${m === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`

  return (
    <div className="rounded-xl border-2 border-[#6B4F7A]/30 bg-gradient-to-r from-[#6B4F7A]/5 to-transparent p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
            Balance de la OC
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Forma de pago: <strong>{formaPagoCalculada}</strong>
          </p>
        </div>
        <div className="text-right">
          {precioVenta > 0 ? (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {fmt(precioVenta, monedaOC)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                Precio de venta
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Cargá un precio para ver el balance
            </p>
          )}
        </div>
      </div>

      {precioVenta > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-white dark:bg-neutral-900 border p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cubierto en {monedaOC}
            </p>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {fmt(cubiertoEnMoneda, monedaOC)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {fmt(
                monedaOC === "USD" ? pagosPorMoneda.USD : pagosPorMoneda.ARS,
                monedaOC
              )}{" "}
              pagos +{" "}
              {fmt(
                monedaOC === "USD"
                  ? permutasPorMoneda.USD
                  : permutasPorMoneda.ARS,
                monedaOC
              )}{" "}
              permutas
              {montoFinanciado > 0 &&
                ` + ${fmt(montoFinanciado, monedaOC)} financiación`}
            </p>
          </div>
          <div
            className={`rounded-md border p-2.5 ${
              cuadrado
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40"
                : falta > 0
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {cuadrado ? "Estado" : falta > 0 ? "Falta cubrir" : "Sobra"}
            </p>
            <p
              className={`text-base font-bold mt-0.5 ${
                cuadrado
                  ? "text-emerald-700 dark:text-emerald-300"
                  : falta > 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {cuadrado ? "✓ Cuadrado" : fmt(Math.abs(falta), monedaOC)}
            </p>
          </div>
          {haySecundaria && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
                ⚠ Hay {monedaOC === "USD" ? "pesos" : "dólares"} sueltos
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5 leading-snug">
                Combinaste monedas. Conviene aclararlo en observaciones con
                el tipo de cambio aplicado.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

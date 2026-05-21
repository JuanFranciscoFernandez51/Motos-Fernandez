/**
 * Helper puro para calcular la cuota "desde" en server-side.
 * Usa la misma lógica que `<CalculadoraCuotas>` (TNA 95% anual, fórmula
 * francesa) pero sin estado de React. Sirve para mostrar el "Desde X
 * cuotas de $YY.YYY" en el hero de la página de modelo, calculado a
 * partir del plazo más largo con anticipo 30%.
 *
 * Si hay un plan cargado que matchea el plazo, usa la cuota del plan
 * en vez del cálculo francés.
 */

export interface PlanFinanciacionInput {
  plan: string
  cuota?: number | null
  entrega?: number | null
  detalle?: string | null
}

const TNA_ESTIMADA = 0.95
const TASA_MENSUAL = TNA_ESTIMADA / 12

export interface CuotaDesdeResult {
  cuota: number
  plazo: number
  anticipoPct: number
  anticipoMonto: number
  usaPlanCargado: boolean
}

/**
 * Devuelve la cuota mensual mínima posible: con el plazo más largo
 * disponible y anticipo del 30%. Si los planes cargados incluyen ese
 * plazo, usa la cuota del plan; sino calcula con la fórmula francesa.
 */
export function calcularCuotaDesde(
  precio: number,
  financiacion: PlanFinanciacionInput[] = []
): CuotaDesdeResult | null {
  if (!precio || precio <= 0) return null

  const PLAZOS = [12, 18, 24, 36, 48]
  const plazo = PLAZOS[PLAZOS.length - 1]
  const anticipoPct = 30
  const anticipoMonto = (precio * anticipoPct) / 100
  const aFinanciar = precio - anticipoMonto

  const planMatch = financiacion.find(
    (p) =>
      p.plan?.toLowerCase().includes(`${plazo} cuotas`) ||
      p.plan?.toLowerCase().includes(`${plazo}c`)
  )

  if (planMatch?.cuota && planMatch.cuota > 0) {
    return {
      cuota: planMatch.cuota,
      plazo,
      anticipoPct,
      anticipoMonto,
      usaPlanCargado: true,
    }
  }

  const factor = Math.pow(1 + TASA_MENSUAL, plazo)
  const cuota = (aFinanciar * (TASA_MENSUAL * factor)) / (factor - 1)

  return {
    cuota,
    plazo,
    anticipoPct,
    anticipoMonto,
    usaPlanCargado: false,
  }
}

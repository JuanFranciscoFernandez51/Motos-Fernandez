/**
 * Planes de financiación reales de Motos Fernandez. Centralizados acá
 * para que la calculadora del catálogo y el cálculo de "Desde X cuotas
 * de $YY" del hero compartan los mismos números.
 *
 * - Propia: hasta 12 cuotas, 5% mensual = 60% TNA, anticipo mínimo 50%
 * - Tarjeta: hasta 24 cuotas, 34% TNA = ~2.833% mensual, sin anticipo
 *   mínimo (se puede financiar el 100%)
 *
 * Si Francisco cambia las tasas o anticipos, se modifican acá y se
 * sincroniza todo (calculadora + hero del catálogo).
 */

export interface PlanFinanciacionInput {
  plan: string
  cuota?: number | null
  entrega?: number | null
  detalle?: string | null
}

export type ModalidadFinanciacion = "propia" | "tarjeta"

export interface ModalidadConfig {
  id: ModalidadFinanciacion
  label: string
  detalle: string
  plazos: number[]
  tnaAnual: number
  tasaMensual: number
  /** Anticipo mínimo permitido como porcentaje (0-100). */
  anticipoMinPct: number
  /** Anticipo máximo permitido como porcentaje (0-100). */
  anticipoMaxPct: number
}

export const MODALIDADES_FINANCIACION: Record<ModalidadFinanciacion, ModalidadConfig> = {
  propia: {
    id: "propia",
    label: "Financiación propia",
    detalle: "5% mensual · anticipo mín. 50%",
    plazos: [3, 6, 9, 12],
    tnaAnual: 0.6,
    tasaMensual: 0.05,
    anticipoMinPct: 50,
    anticipoMaxPct: 90,
  },
  tarjeta: {
    id: "tarjeta",
    label: "Con tarjeta de crédito",
    detalle: "Hasta 24 cuotas · 34% TNA",
    plazos: [3, 6, 12, 18, 24],
    tnaAnual: 0.34,
    tasaMensual: 0.34 / 12,
    anticipoMinPct: 0,
    anticipoMaxPct: 90,
  },
}

/**
 * Fórmula francesa: cuota mensual constante.
 *   cuota = capital * (i * (1+i)^n) / ((1+i)^n - 1)
 */
export function calcularCuotaFrancesa(
  capital: number,
  tasaMensual: number,
  plazo: number
): number {
  if (capital <= 0 || plazo <= 0) return 0
  if (tasaMensual === 0) return capital / plazo
  const factor = Math.pow(1 + tasaMensual, plazo)
  return (capital * (tasaMensual * factor)) / (factor - 1)
}

export interface CuotaDesdeResult {
  cuota: number
  plazo: number
  modalidad: ModalidadFinanciacion
  modalidadLabel: string
  anticipoPct: number
  anticipoMonto: number
  usaPlanCargado: boolean
}

/**
 * Devuelve la mejor cuota posible (la más baja) considerando ambas
 * modalidades, usando el plazo más largo de cada una y el anticipo
 * MÍNIMO permitido (tarjeta: 0%, propia: 50%). Si los planes cargados
 * (Json del modelo) traen una cuota explícita que matchea el plazo, se
 * usa por sobre el cálculo francés.
 */
export function calcularCuotaDesde(
  precio: number,
  financiacion: PlanFinanciacionInput[] = []
): CuotaDesdeResult | null {
  if (!precio || precio <= 0) return null

  const candidatos: CuotaDesdeResult[] = []

  for (const modalidad of Object.values(MODALIDADES_FINANCIACION)) {
    const plazo = modalidad.plazos[modalidad.plazos.length - 1]
    const anticipoPct = modalidad.anticipoMinPct
    const anticipoMonto = (precio * anticipoPct) / 100
    const aFinanciar = precio - anticipoMonto

    // Intentar matchear con un plan cargado a mano para el modelo
    const planMatch = financiacion.find(
      (p) =>
        p.plan?.toLowerCase().includes(`${plazo} cuotas`) ||
        p.plan?.toLowerCase().includes(`${plazo}c`)
    )

    let cuota: number
    let usaPlanCargado = false
    if (planMatch?.cuota && planMatch.cuota > 0) {
      cuota = planMatch.cuota
      usaPlanCargado = true
    } else {
      cuota = calcularCuotaFrancesa(aFinanciar, modalidad.tasaMensual, plazo)
    }

    candidatos.push({
      cuota,
      plazo,
      modalidad: modalidad.id,
      modalidadLabel: modalidad.label,
      anticipoPct,
      anticipoMonto,
      usaPlanCargado,
    })
  }

  // El mejor "desde" es el de menor cuota mensual
  candidatos.sort((a, b) => a.cuota - b.cuota)
  return candidatos[0]
}

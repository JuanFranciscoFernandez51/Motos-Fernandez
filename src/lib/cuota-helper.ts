/**
 * Planes de financiación reales de Motos Fernandez. Centralizados acá
 * para que la calculadora del catálogo y el cálculo de "Desde X cuotas
 * de $YY" del hero compartan los mismos números.
 *
 * - Propia: hasta 12 cuotas, 5% mensual = 60% TNA
 * - Tarjeta de crédito: hasta 24 cuotas, 34% TNA = ~2.833% mensual
 *
 * Si Francisco cambia las tasas, se modifican acá y se sincroniza todo.
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
}

export const MODALIDADES_FINANCIACION: Record<ModalidadFinanciacion, ModalidadConfig> = {
  propia: {
    id: "propia",
    label: "Financiación propia",
    detalle: "Sin pasar por banco · 5% mensual",
    plazos: [3, 6, 9, 12],
    tnaAnual: 0.6,
    tasaMensual: 0.05,
  },
  tarjeta: {
    id: "tarjeta",
    label: "Con tarjeta de crédito",
    detalle: "Hasta 24 cuotas · 34% TNA",
    plazos: [3, 6, 12, 18, 24],
    tnaAnual: 0.34,
    tasaMensual: 0.34 / 12,
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
 * modalidades en el plazo más largo de cada una y anticipo 30%. Si en
 * los planes cargados (Json del modelo) hay una cuota explícita que
 * matchea, la usa por sobre el cálculo.
 */
export function calcularCuotaDesde(
  precio: number,
  financiacion: PlanFinanciacionInput[] = []
): CuotaDesdeResult | null {
  if (!precio || precio <= 0) return null

  const anticipoPct = 30
  const anticipoMonto = (precio * anticipoPct) / 100
  const aFinanciar = precio - anticipoMonto

  const candidatos: CuotaDesdeResult[] = []

  for (const modalidad of Object.values(MODALIDADES_FINANCIACION)) {
    const plazo = modalidad.plazos[modalidad.plazos.length - 1]

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

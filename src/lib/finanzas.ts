/**
 * Finanzas — lógica de cálculo pura (sin DB). Cash-basis: la fuente de verdad
 * son los Movimientos. Cuentas por cobrar/pagar y cheques son devengado
 * (informativo) y no ensucian el resultado de caja.
 *
 * Money: SIEMPRE Int en pesos (sin centavos).
 */

export const TIPOS_MOVIMIENTO = ["INGRESO", "GASTO", "TRANSFERENCIA"] as const
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number]

/** Efecto de un movimiento sobre el saldo de su cuenta. */
export function efectoSaldo(mov: { tipo: string; monto: number }): number {
  if (mov.tipo === "INGRESO") return mov.monto
  if (mov.tipo === "GASTO") return -mov.monto
  // TRANSFERENCIA: el monto ya viene con signo (sale negativo / entra positivo)
  return mov.monto
}

/**
 * Fecha "de día" guardada a MEDIODÍA UTC. Si se guarda a medianoche UTC, en
 * Argentina (UTC-3) se ve un día antes y el filtro por mes se corre. Usar este
 * helper en TODAS las rutas que guardan una fecha de calendario.
 */
export function fechaDeInput(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split("-").map((n) => parseInt(n, 10))
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

/** yyyy-mm-dd (en UTC) de una fecha, para inputs date. */
export function inputDeFecha(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}

/** Rango [desde, hasta) de un mes (año, mes 1-12) en horario que cubre AR. */
export function rangoMes(anio: number, mes1a12: number): { desde: Date; hasta: Date } {
  const desde = new Date(Date.UTC(anio, mes1a12 - 1, 1, 0, 0, 0))
  const hasta = new Date(Date.UTC(anio, mes1a12, 1, 0, 0, 0))
  return { desde, hasta }
}

/** Saldo de una cuenta = saldoInicial + Σ efectoSaldo(mov). */
export function saldoCuenta(
  saldoInicial: number,
  movimientos: { tipo: string; monto: number }[]
): number {
  return saldoInicial + movimientos.reduce((s, m) => s + efectoSaldo(m), 0)
}

export interface MovParaResultado {
  tipo: string
  monto: number
  categoria: string
  moneda: string
  registrado: boolean
  excluido: boolean // de la cuenta (excluirDeResultado)
}

/**
 * Resultado de caja de un set de movimientos. Solo INGRESO/GASTO de cuentas no
 * excluidas. Devuelve totales reales (blanco+negro) + el split.
 */
export function resultadoCaja(movs: MovParaResultado[], moneda = "ARS") {
  let ingresos = 0
  let gastos = 0
  let ingresosBlanco = 0
  let gastosBlanco = 0
  for (const m of movs) {
    if (m.excluido) continue
    if (m.moneda !== moneda) continue
    if (m.tipo === "INGRESO") {
      ingresos += m.monto
      if (m.registrado) ingresosBlanco += m.monto
    } else if (m.tipo === "GASTO") {
      gastos += m.monto
      if (m.registrado) gastosBlanco += m.monto
    }
  }
  const resultado = ingresos - gastos
  const ingresosNegro = ingresos - ingresosBlanco
  const gastosNegro = gastos - gastosBlanco
  const margen = ingresos > 0 ? (resultado / ingresos) * 100 : 0
  return {
    ingresos,
    gastos,
    resultado,
    margen,
    blanco: { ingresos: ingresosBlanco, gastos: gastosBlanco, resultado: ingresosBlanco - gastosBlanco },
    negro: { ingresos: ingresosNegro, gastos: gastosNegro, resultado: ingresosNegro - gastosNegro },
  }
}

/** Breakeven: ventas/mes para cubrir el costo fijo. */
export function ventasBreakeven(totalCostosFijos: number, margenBrutoVenta: number): number {
  if (margenBrutoVenta <= 0) return 0
  return totalCostosFijos / margenBrutoVenta
}

// ---- Defaults editables (seed inicial; luego se gestionan desde la UI) ----

export const CATEGORIAS_INGRESO_DEFAULT = [
  "Comisión por venta (consignación)",
  "Venta de moto propia",
  "Servicio técnico / Taller",
  "Repuestos",
  "Accesorios",
  "Gestoría / Transferencias de dominio",
  "Otros ingresos",
]

export const CATEGORIAS_GASTO_DEFAULT = [
  "Compra de moto (propia)",
  "Repuestos para taller",
  "Sueldos",
  "Alquiler",
  "Servicios (luz/internet)",
  "Impuestos",
  "Gastos bancarios",
  "Publicidad",
  "Combustible / Movilidad",
  "Mantenimiento",
  "Otros gastos",
]

export const TIPOS_CXC = [
  "Crédito personal",
  "Seña de moto",
  "Saldo de servicio",
  "Gestoría pendiente",
  "Proveedor",
  "Préstamo",
  "Otro",
]

export const METODOS_PAGO_FIN = [
  "Efectivo",
  "Transferencia",
  "Tarjeta",
  "MercadoPago",
  "Cheque",
  "Depósito",
  "Otro",
]

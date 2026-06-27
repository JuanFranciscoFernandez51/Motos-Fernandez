import type { CuentaFinanciera, MovimientoFinanciero, TipoMovimiento } from "@prisma/client"

// ─────────────────────────────────────────────────────────────
// Categorías (del Excel). Editables a futuro desde un admin propio.
// ─────────────────────────────────────────────────────────────
export const CATEGORIAS_INGRESO = [
  "Venta de Motos",
  "Accesorios de Moto",
  "Indumentaria Vespa",
  "Servicio Técnico / Taller",
  "Ingresos por Transportes",
  "Otros Ingresos",
] as const

export const CATEGORIAS_GASTO = [
  "Compra de Stock (Motos)",
  "Compra de Stock (Accesorios/Indumentaria)",
  "Alquiler del Local",
  "Sueldos y Cargas Sociales",
  "Impuestos",
  "Servicios",
  "Marketing / Publicidad",
  "Seguros",
  "Gastos Bancarios",
  "Mantenimiento / Reparaciones",
  "Gastos Extra Mateo",
  "Gastos Extra Juanfri",
  "Gastos por Transportes",
  "Otros Gastos",
] as const

export const CATEGORIA_TRANSFERENCIA = "Transferencia entre cuentas"

// Tipos de cuentas a cobrar
export const TIPOS_POR_COBRAR = [
  "Crédito personal",
  "Crédito prendario",
  "Liberación de tarjeta",
  "Indumentaria",
  "Accesorios",
  "Reparaciones",
  "Otro",
] as const

export const TIPOS_POR_PAGAR = [
  "Compra de moto",
  "Compra de stock",
  "Proveedor",
  "Impuestos",
  "Sueldos",
  "Préstamo / banco",
  "Otro",
] as const

/**
 * Normaliza una fecha "de día" (sin hora relevante) a MEDIODÍA UTC.
 * Las fechas de finanzas se cargan desde <input type="date"> ("YYYY-MM-DD").
 * Si se guardaran a medianoche UTC, en Argentina (UTC-3) se verían un día antes
 * y el filtro por mes correría al mes anterior. Mediodía UTC nunca cruza de día
 * en América/Europa, así que la fecha se ve y se filtra siempre correcta.
 */
export function fechaDeInput(valor: string | Date): Date {
  if (valor instanceof Date) {
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate(), 12))
  }
  const m = String(valor).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
  const d = new Date(valor)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12))
}

export function categoriasPorTipo(tipo: TipoMovimiento): readonly string[] {
  if (tipo === "INGRESO") return CATEGORIAS_INGRESO
  if (tipo === "GASTO") return CATEGORIAS_GASTO
  return [CATEGORIA_TRANSFERENCIA]
}

export const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
export const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

// Movimiento con su cuenta incluida (lo que devuelven las queries)
export type MovimientoConCuenta = MovimientoFinanciero & { cuenta: CuentaFinanciera }

/**
 * Efecto de un movimiento sobre el SALDO de su cuenta:
 *  - INGRESO        → +monto
 *  - GASTO          → −monto
 *  - TRANSFERENCIA  → +monto (ya viene con signo: salida negativa, entrada positiva)
 */
export function efectoSaldo(m: Pick<MovimientoFinanciero, "tipo" | "monto">): number {
  if (m.tipo === "INGRESO") return m.monto
  if (m.tipo === "GASTO") return -m.monto
  return m.monto // TRANSFERENCIA (con signo)
}

// ─────────────────────────────────────────────────────────────
// SALDOS POR CUENTA
// ─────────────────────────────────────────────────────────────
export type SaldoCuenta = {
  cuenta: CuentaFinanciera
  saldoInicial: number
  movimientoNeto: number
  saldoActual: number
}

export function calcularSaldos(
  cuentas: CuentaFinanciera[],
  movimientos: Pick<MovimientoFinanciero, "cuentaId" | "tipo" | "monto">[]
): SaldoCuenta[] {
  const netoPorCuenta = new Map<string, number>()
  for (const m of movimientos) {
    netoPorCuenta.set(m.cuentaId, (netoPorCuenta.get(m.cuentaId) ?? 0) + efectoSaldo(m))
  }
  return cuentas.map((c) => {
    const movimientoNeto = netoPorCuenta.get(c.id) ?? 0
    return {
      cuenta: c,
      saldoInicial: c.saldoInicial,
      movimientoNeto,
      saldoActual: c.saldoInicial + movimientoNeto,
    }
  })
}

// ─────────────────────────────────────────────────────────────
// RESUMEN MENSUAL
// ─────────────────────────────────────────────────────────────
export type LineaCategoria = { categoria: string; monto: number }

export type ResumenMensual = {
  mes: number // 0-11
  anio: number
  ingresos: LineaCategoria[]
  gastos: LineaCategoria[]
  totalIngresos: number
  totalGastos: number
  resultado: number
  margen: number // %
  // USD
  ingresosUSD: number
  gastosUSD: number
  resultadoUSD: number
  // Neto por cuenta (ARS) del mes
  netoPorCuenta: { cuenta: string; neto: number }[]
}

/** ¿El movimiento cuenta para ingresos/gastos? (excluye Cuenta Papá) */
function cuentaEnResultado(m: MovimientoConCuenta): boolean {
  return !m.cuenta.excluirDeResultado
}

/**
 * Une las categorías configuradas (en orden) con cualquier categoría presente en
 * los datos que no esté configurada, para no "perder" movimientos viejos cuyo
 * nombre de categoría haya cambiado o se haya borrado de la lista.
 */
function categoriasEfectivas(
  configuradas: readonly string[],
  movs: MovimientoConCuenta[],
  tipo: TipoMovimiento
): string[] {
  const set = new Set(configuradas)
  const extras: string[] = []
  for (const m of movs) {
    if (m.tipo === tipo && cuentaEnResultado(m) && !set.has(m.categoria)) {
      set.add(m.categoria)
      extras.push(m.categoria)
    }
  }
  return [...configuradas, ...extras]
}

export function calcularResumenMensual(
  movimientos: MovimientoConCuenta[],
  cuentas: CuentaFinanciera[],
  mes: number,
  anio: number,
  catIngreso: readonly string[] = CATEGORIAS_INGRESO,
  catGasto: readonly string[] = CATEGORIAS_GASTO
): ResumenMensual {
  const delMes = movimientos.filter((m) => {
    const f = new Date(m.fecha)
    return f.getMonth() === mes && f.getFullYear() === anio
  })

  const sum = (cat: string, tipo: TipoMovimiento, moneda: string) =>
    delMes
      .filter(
        (m) =>
          m.tipo === tipo &&
          m.categoria === cat &&
          m.moneda === moneda &&
          cuentaEnResultado(m)
      )
      .reduce((a, m) => a + m.monto, 0)

  const ingresos = categoriasEfectivas(catIngreso, delMes, "INGRESO").map((c) => ({ categoria: c, monto: sum(c, "INGRESO", "ARS") }))
  const gastos = categoriasEfectivas(catGasto, delMes, "GASTO").map((c) => ({ categoria: c, monto: sum(c, "GASTO", "ARS") }))

  const totalIngresos = ingresos.reduce((a, l) => a + l.monto, 0)
  const totalGastos = gastos.reduce((a, l) => a + l.monto, 0)
  const resultado = totalIngresos - totalGastos
  const margen = totalIngresos > 0 ? (resultado / totalIngresos) * 100 : 0

  // USD
  const ingresosUSD = delMes
    .filter((m) => m.tipo === "INGRESO" && m.moneda === "USD" && cuentaEnResultado(m))
    .reduce((a, m) => a + m.monto, 0)
  const gastosUSD = delMes
    .filter((m) => m.tipo === "GASTO" && m.moneda === "USD" && cuentaEnResultado(m))
    .reduce((a, m) => a + m.monto, 0)

  // Neto por cuenta ARS del mes
  const netoPorCuenta = cuentas
    .filter((c) => c.moneda === "ARS")
    .map((c) => {
      const neto = delMes
        .filter((m) => m.cuentaId === c.id)
        .reduce((a, m) => a + efectoSaldo(m), 0)
      return { cuenta: c.nombre, neto }
    })

  return {
    mes,
    anio,
    ingresos,
    gastos,
    totalIngresos,
    totalGastos,
    resultado,
    margen,
    ingresosUSD,
    gastosUSD,
    resultadoUSD: ingresosUSD - gastosUSD,
    netoPorCuenta,
  }
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD ANUAL (matriz 12 meses)
// ─────────────────────────────────────────────────────────────
export type FilaAnual = { categoria: string; meses: number[]; total: number }

export type DashboardAnual = {
  anio: number
  ingresos: FilaAnual[]
  gastos: FilaAnual[]
  totalIngresosMes: number[]
  totalGastosMes: number[]
  resultadoMes: number[]
  resultadoAcumulado: number[]
  margenMes: number[]
  totalIngresosAnual: number
  totalGastosAnual: number
  resultadoAnual: number
  // USD
  ingresosUSDMes: number[]
  gastosUSDMes: number[]
  resultadoUSDMes: number[]
}

export function calcularDashboardAnual(
  movimientos: MovimientoConCuenta[],
  anio: number,
  catIngreso: readonly string[] = CATEGORIAS_INGRESO,
  catGasto: readonly string[] = CATEGORIAS_GASTO
): DashboardAnual {
  const delAnio = movimientos.filter((m) => new Date(m.fecha).getFullYear() === anio)

  const filaPorCategoria = (cats: readonly string[], tipo: TipoMovimiento, moneda = "ARS"): FilaAnual[] =>
    categoriasEfectivas(cats, delAnio, tipo).map((cat) => {
      const meses = Array.from({ length: 12 }, (_, mi) =>
        delAnio
          .filter(
            (m) =>
              m.tipo === tipo &&
              m.categoria === cat &&
              m.moneda === moneda &&
              cuentaEnResultado(m) &&
              new Date(m.fecha).getMonth() === mi
          )
          .reduce((a, m) => a + m.monto, 0)
      )
      return { categoria: cat, meses, total: meses.reduce((a, b) => a + b, 0) }
    })

  const ingresos = filaPorCategoria(catIngreso, "INGRESO")
  const gastos = filaPorCategoria(catGasto, "GASTO")

  const sumColumnas = (filas: FilaAnual[]) =>
    Array.from({ length: 12 }, (_, mi) => filas.reduce((a, f) => a + f.meses[mi], 0))

  const totalIngresosMes = sumColumnas(ingresos)
  const totalGastosMes = sumColumnas(gastos)
  const resultadoMes = totalIngresosMes.map((v, i) => v - totalGastosMes[i])
  const margenMes = resultadoMes.map((r, i) => (totalIngresosMes[i] > 0 ? (r / totalIngresosMes[i]) * 100 : 0))

  let acc = 0
  const resultadoAcumulado = resultadoMes.map((r) => (acc += r))

  // USD por mes
  const usdMes = (tipo: TipoMovimiento) =>
    Array.from({ length: 12 }, (_, mi) =>
      delAnio
        .filter(
          (m) =>
            m.tipo === tipo &&
            m.moneda === "USD" &&
            cuentaEnResultado(m) &&
            new Date(m.fecha).getMonth() === mi
        )
        .reduce((a, m) => a + m.monto, 0)
    )
  const ingresosUSDMes = usdMes("INGRESO")
  const gastosUSDMes = usdMes("GASTO")

  return {
    anio,
    ingresos,
    gastos,
    totalIngresosMes,
    totalGastosMes,
    resultadoMes,
    resultadoAcumulado,
    margenMes,
    totalIngresosAnual: totalIngresosMes.reduce((a, b) => a + b, 0),
    totalGastosAnual: totalGastosMes.reduce((a, b) => a + b, 0),
    resultadoAnual: resultadoMes.reduce((a, b) => a + b, 0),
    ingresosUSDMes,
    gastosUSDMes,
    resultadoUSDMes: ingresosUSDMes.map((v, i) => v - gastosUSDMes[i]),
  }
}

// ─────────────────────────────────────────────────────────────
// ETAPA 2 — Costos Fijos (métricas/breakeven) y Calculador de Precios
// ─────────────────────────────────────────────────────────────
export type MetricasCostosFijos = {
  totalMensual: number
  costoPorDia: number
  costoPorMoto: number
  motosMinimas: number // breakeven: motos/mes para cubrir el costo fijo
  costoAnual: number
}

export function calcularMetricasCostosFijos(
  costos: { monto: number; activo: boolean }[],
  config: { motosEstimadasMes: number; margenBrutoMoto: number }
): MetricasCostosFijos {
  const totalMensual = costos.filter((c) => c.activo).reduce((a, c) => a + c.monto, 0)
  return {
    totalMensual,
    costoPorDia: totalMensual / 30,
    costoPorMoto: config.motosEstimadasMes > 0 ? totalMensual / config.motosEstimadasMes : 0,
    motosMinimas: config.margenBrutoMoto > 0 ? totalMensual / config.margenBrutoMoto : 0,
    costoAnual: totalMensual * 12,
  }
}

export const CATEGORIAS_CALCULADOR = ["Indumentaria", "Cascos", "Repuestos", "Accesorios"] as const

export function markupDeCategoria(
  categoria: string,
  config: { markupIndumentaria: number; markupCascos: number; markupRepuestos: number; markupAccesorios: number }
): number {
  switch (categoria) {
    case "Indumentaria": return config.markupIndumentaria
    case "Cascos": return config.markupCascos
    case "Repuestos": return config.markupRepuestos
    case "Accesorios": return config.markupAccesorios
    default: return config.markupAccesorios
  }
}

export type PrecioCalculado = {
  costoNeto: number
  costoConIva: number
  markup: number
  precioSugerido: number
  ganancia: number
  margen: number // %
}

/** Precio sugerido = costo c/IVA × (1 + markup). Ganancia y margen sobre el precio. */
export function calcularPrecioSugerido(
  costoNeto: number,
  markup: number,
  ivaPorcentaje: number
): PrecioCalculado {
  const costoConIva = costoNeto * (1 + ivaPorcentaje / 100)
  const precioSugerido = Math.round(costoConIva * (1 + markup))
  const ganancia = precioSugerido - costoConIva
  const margen = precioSugerido > 0 ? (ganancia / precioSugerido) * 100 : 0
  return { costoNeto, costoConIva, markup, precioSugerido, ganancia, margen }
}

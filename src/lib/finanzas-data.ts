import { prisma } from "@/lib/prisma"
import { efectoSaldo, rangoMes, resultadoCaja, type MovParaResultado } from "@/lib/finanzas"

/** Movimientos de un mes con filtros opcionales, ordenados por fecha desc. */
export async function getMovimientos(opts: {
  anio: number
  mes: number
  cuentaId?: string
  tipo?: string
  q?: string
}) {
  const { desde, hasta } = rangoMes(opts.anio, opts.mes)
  const where: Record<string, unknown> = { fecha: { gte: desde, lt: hasta } }
  if (opts.cuentaId) where.cuentaId = opts.cuentaId
  if (opts.tipo) where.tipo = opts.tipo
  if (opts.q) {
    where.OR = [
      { descripcion: { contains: opts.q, mode: "insensitive" } },
      { categoria: { contains: opts.q, mode: "insensitive" } },
      { observaciones: { contains: opts.q, mode: "insensitive" } },
    ]
  }
  const movs = await prisma.movimientoFinanciero.findMany({
    where,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: { cuenta: { select: { nombre: true, moneda: true } } },
  })
  return movs
}

/** Cuentas activas con su saldo computado (saldoInicial + Σ movimientos). */
export async function getCuentasConSaldo() {
  const cuentas = await prisma.cuentaFinanciera.findMany({
    where: { activa: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { movimientos: { select: { tipo: true, monto: true } } },
  })
  return cuentas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    moneda: c.moneda,
    excluirDeResultado: c.excluirDeResultado,
    saldoInicial: c.saldoInicial,
    saldo: c.saldoInicial + c.movimientos.reduce((s, m) => s + efectoSaldo(m), 0),
    movimientos: c.movimientos.length,
  }))
}

/** Resumen de un mes: resultado de caja (ARS) + bloque USD + por categoría. */
export async function getResumenMes(anio: number, mes1a12: number) {
  const { desde, hasta } = rangoMes(anio, mes1a12)
  const movs = await prisma.movimientoFinanciero.findMany({
    where: { fecha: { gte: desde, lt: hasta }, tipo: { in: ["INGRESO", "GASTO"] } },
    include: { cuenta: { select: { excluirDeResultado: true } } },
  })

  const paraResultado: MovParaResultado[] = movs.map((m) => ({
    tipo: m.tipo,
    monto: m.monto,
    categoria: m.categoria,
    moneda: m.moneda,
    registrado: m.registrado,
    excluido: m.cuenta.excluirDeResultado,
  }))

  const ars = resultadoCaja(paraResultado, "ARS")
  const usd = resultadoCaja(paraResultado, "USD")

  // Por categoría (ARS, cuentas no excluidas)
  const porCategoria = new Map<string, { tipo: string; total: number; blanco: number }>()
  for (const m of paraResultado) {
    if (m.excluido || m.moneda !== "ARS") continue
    const acc = porCategoria.get(m.categoria) || { tipo: m.tipo, total: 0, blanco: 0 }
    acc.total += m.monto
    if (m.registrado) acc.blanco += m.monto
    porCategoria.set(m.categoria, acc)
  }
  const categorias = [...porCategoria.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.total - a.total)

  return {
    ars,
    usd,
    ingresosCategorias: categorias.filter((c) => c.tipo === "INGRESO"),
    gastosCategorias: categorias.filter((c) => c.tipo === "GASTO"),
    cantidad: movs.length,
  }
}

/** Vencimientos próximos (≤ N días) o atrasados: cheques + cuentas por cobrar/pagar. */
export async function getProximosVencimientos(dias = 7) {
  const limite = new Date()
  limite.setDate(limite.getDate() + dias)
  const [cheques, cxc] = await Promise.all([
    prisma.cheque.findMany({
      where: { estado: "PENDIENTE", fechaVencimiento: { lte: limite } },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.cuentaPorCobrar.findMany({
      where: { estado: "PENDIENTE", fechaVencimiento: { not: null, lte: limite } },
      orderBy: { fechaVencimiento: "asc" },
    }),
  ])
  const items = [
    ...cheques.map((c) => ({
      clase: "Cheque",
      detalle: `${c.tipo === "A_COBRAR" ? "A cobrar" : "A pagar"} · ${c.beneficiario}`,
      monto: c.monto,
      moneda: c.moneda,
      fecha: c.fechaVencimiento,
      entra: c.tipo === "A_COBRAR",
    })),
    ...cxc.map((c) => ({
      clase: c.sentido === "COBRAR" ? "A cobrar" : "A pagar",
      detalle: `${c.cliente} · ${c.tipo}`,
      monto: c.monto,
      moneda: c.moneda,
      fecha: c.fechaVencimiento!,
      entra: c.sentido === "COBRAR",
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  return items
}

/** Neto (cambio de saldo) por cuenta en un mes — incluye transferencias. */
export async function getNetoPorCuentaMes(anio: number, mes1a12: number) {
  const { desde, hasta } = rangoMes(anio, mes1a12)
  const movs = await prisma.movimientoFinanciero.findMany({
    where: { fecha: { gte: desde, lt: hasta } },
    include: { cuenta: { select: { nombre: true, moneda: true } } },
  })
  const map = new Map<string, { nombre: string; moneda: string; neto: number }>()
  for (const m of movs) {
    const acc = map.get(m.cuentaId) || { nombre: m.cuenta.nombre, moneda: m.cuenta.moneda, neto: 0 }
    acc.neto += efectoSaldo(m)
    map.set(m.cuentaId, acc)
  }
  return [...map.values()].sort((a, b) => Math.abs(b.neto) - Math.abs(a.neto))
}

/**
 * Dashboard anual (ARS, cuentas no excluidas): por mes ingresos/gastos/resultado
 * + acumulado, matriz de categorías × 12 meses, totales.
 */
export async function getDashboardAnual(anio: number) {
  const desde = new Date(Date.UTC(anio, 0, 1))
  const hasta = new Date(Date.UTC(anio + 1, 0, 1))
  const movs = await prisma.movimientoFinanciero.findMany({
    where: { fecha: { gte: desde, lt: hasta }, tipo: { in: ["INGRESO", "GASTO"] }, moneda: "ARS" },
    include: { cuenta: { select: { excluirDeResultado: true } } },
  })

  const meses = Array.from({ length: 12 }, () => ({ ingresos: 0, gastos: 0, blancoIng: 0, blancoGas: 0 }))
  const catMap = new Map<string, { tipo: string; montos: number[] }>()

  for (const m of movs) {
    if (m.cuenta.excluirDeResultado) continue
    const i = new Date(m.fecha).getUTCMonth() // fecha a mediodía UTC → mes correcto
    if (m.tipo === "INGRESO") {
      meses[i].ingresos += m.monto
      if (m.registrado) meses[i].blancoIng += m.monto
    } else {
      meses[i].gastos += m.monto
      if (m.registrado) meses[i].blancoGas += m.monto
    }
    const c = catMap.get(m.categoria) || { tipo: m.tipo, montos: Array(12).fill(0) }
    c.montos[i] += m.monto
    catMap.set(m.categoria, c)
  }

  let acum = 0
  const mensual = meses.map((mm, i) => {
    const resultado = mm.ingresos - mm.gastos
    acum += resultado
    return {
      mes: i + 1,
      ingresos: mm.ingresos,
      gastos: mm.gastos,
      resultado,
      acumulado: acum,
      resultadoBlanco: mm.blancoIng - mm.blancoGas,
    }
  })
  const categorias = [...catMap.entries()]
    .map(([nombre, v]) => ({ nombre, tipo: v.tipo, montos: v.montos, total: v.montos.reduce((s, x) => s + x, 0) }))
    .sort((a, b) => b.total - a.total)

  const totalIngresos = mensual.reduce((s, m) => s + m.ingresos, 0)
  const totalGastos = mensual.reduce((s, m) => s + m.gastos, 0)
  return {
    mensual,
    categorias,
    totalIngresos,
    totalGastos,
    resultadoAnual: totalIngresos - totalGastos,
  }
}

/**
 * Posición total (ARS): saldos en cuentas + por cobrar pendiente + valor del
 * stock PROPIO. Las motos en consignación (mandato) NO son activo nuestro: solo
 * contamos las que entraron como parte de pago / compra propia (valorToma).
 */
export async function getPosicionTotal() {
  const [cuentas, porCobrar, porPagar, stockPropio] = await Promise.all([
    getCuentasConSaldo(),
    prisma.cuentaPorCobrar.aggregate({
      where: { sentido: "COBRAR", estado: "PENDIENTE", moneda: "ARS" },
      _sum: { monto: true },
    }),
    prisma.cuentaPorCobrar.aggregate({
      where: { sentido: "PAGAR", estado: "PENDIENTE", moneda: "ARS" },
      _sum: { monto: true },
    }),
    prisma.modelo.aggregate({
      where: { origen: "PARTE_DE_PAGO", vendida: false, valorTomaMoneda: "ARS" },
      _sum: { valorToma: true },
    }),
  ])

  const saldosArs = cuentas
    .filter((c) => c.moneda === "ARS" && !c.excluirDeResultado)
    .reduce((s, c) => s + c.saldo, 0)
  const saldosUsd = cuentas
    .filter((c) => c.moneda === "USD" && !c.excluirDeResultado)
    .reduce((s, c) => s + c.saldo, 0)

  return {
    saldosArs,
    saldosUsd,
    porCobrar: porCobrar._sum.monto || 0,
    porPagar: porPagar._sum.monto || 0,
    stockPropio: stockPropio._sum.valorToma || 0,
    // Posición = caja + por cobrar - por pagar + stock propio (solo ARS)
    posicionArs:
      saldosArs +
      (porCobrar._sum.monto || 0) -
      (porPagar._sum.monto || 0) +
      (stockPropio._sum.valorToma || 0),
  }
}

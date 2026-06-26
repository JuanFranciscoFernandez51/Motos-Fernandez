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

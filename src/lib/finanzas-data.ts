import { prisma } from "@/lib/prisma"
import { calcularSaldos, type SaldoCuenta, CATEGORIAS_INGRESO, CATEGORIAS_GASTO } from "@/lib/finanzas"

/**
 * Reintenta una operación de DB ante fallas transitorias (ej: cold-start de Neon,
 * timeout de conexión). Evita que un hipo momentáneo tire la página de Finanzas.
 */
async function conReintento<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
  let ultimoError: unknown
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn()
    } catch (e) {
      ultimoError = e
      await new Promise((r) => setTimeout(r, 250 * (i + 1)))
    }
  }
  throw ultimoError
}

/**
 * Categorías de ingresos/gastos configuradas (editables desde la UI).
 * Si la tabla está vacía (instalación nueva), cae a las constantes por defecto.
 */
export async function getCategorias(): Promise<{ ingreso: string[]; gasto: string[] }> {
  const cats = await conReintento(() =>
    prisma.categoriaFinanciera.findMany({ where: { activa: true }, orderBy: { orden: "asc" } })
  )
  const ingreso = cats.filter((c) => c.tipo === "INGRESO").map((c) => c.nombre)
  const gasto = cats.filter((c) => c.tipo === "GASTO").map((c) => c.nombre)
  return {
    ingreso: ingreso.length ? ingreso : [...CATEGORIAS_INGRESO],
    gasto: gasto.length ? gasto : [...CATEGORIAS_GASTO],
  }
}

/**
 * Valor del stock de mercadería (motos en stock + productos de tienda).
 * Replica la hoja "Saldos por Cuenta" → bloque VALOR DE STOCK.
 */
export async function getValorStock() {
  // Valor de stock = SOLO motos NUESTRAS (no las de consignación/mandato, que no
  // son un activo nuestro). Tampoco las 0KM publicitarias. Físicas y disponibles:
  // usadas activas, no vendidas, con origen propio (stock propio o parte de pago).
  const motos = await prisma.modelo.findMany({
    where: {
      condicion: "USADA",
      vendida: false,
      activo: true,
      origen: { not: "MANDATO" },
      // CLAVE: una moto en consignación NO es un activo nuestro aunque esté
      // tagueada STOCK_PROPIO/PARTE_DE_PAGO. La señal confiable es el mandato:
      // si tiene un mandato ACTIVO, es de un tercero → no cuenta en el stock.
      mandato: { isNot: { estado: "ACTIVO" } },
    },
    select: { precio: true, valorToma: true },
  })
  // Valuamos a VALOR DE TOMA (costo): es lo que realmente pusimos en la moto.
  // La diferencia con el precio de venta se carga como ganancia al vender
  // (gananciaBruta de la OC). Si una moto no tiene costo cargado, caemos al
  // precio de publicación como mejor estimación disponible.
  const valorMotos = motos.reduce((a, m) => a + (m.valorToma ?? m.precio ?? 0), 0)
  const unidadesMotos = motos.length

  // Productos de tienda, separados en Repuestos vs Indumentaria/Accesorios (resto)
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { stock: true, precio: true, categoria: { select: { nombre: true } } },
  })
  let valorRepuestos = 0, unidadesRepuestos = 0, valorIndum = 0, unidadesIndum = 0
  for (const p of productos) {
    const v = p.stock * p.precio
    if ((p.categoria?.nombre || "").toLowerCase().includes("repuesto")) {
      valorRepuestos += v; unidadesRepuestos += p.stock
    } else {
      valorIndum += v; unidadesIndum += p.stock
    }
  }
  const valorProductos = valorRepuestos + valorIndum
  const unidadesProductos = unidadesRepuestos + unidadesIndum
  const valorTotal = valorMotos + valorProductos

  // Consignación (mandato ACTIVO): motos de terceros que tenemos en el local.
  // NO son un activo nuestro → se muestran aparte, valuadas a precio de
  // publicación (lo que están exhibidas), solo como referencia.
  const consig = await prisma.modelo.findMany({
    where: { condicion: "USADA", vendida: false, activo: true, mandato: { is: { estado: "ACTIVO" } } },
    select: { precio: true, valorToma: true },
  })
  const valorConsignacion = consig.reduce((a, m) => a + (m.precio ?? m.valorToma ?? 0), 0)
  const unidadesConsignacion = consig.length

  // Desglose por categoría con % del total (como la hoja "Saldos" del Excel)
  const desglose = [
    { label: "Motos", unidades: unidadesMotos, valor: valorMotos },
    { label: "Repuestos", unidades: unidadesRepuestos, valor: valorRepuestos },
    { label: "Indumentaria y accesorios", unidades: unidadesIndum, valor: valorIndum },
  ].map((d) => ({ ...d, pct: valorTotal > 0 ? (d.valor / valorTotal) * 100 : 0 }))

  return {
    valorMotos,
    unidadesMotos,
    valorRepuestos,
    unidadesRepuestos,
    valorIndum,
    unidadesIndum,
    valorProductos,
    unidadesProductos,
    valorTotal,
    desglose,
    valorConsignacion,
    unidadesConsignacion,
  }
}

/**
 * Cuentas a cobrar pendientes (créditos personales/prendarios, liberaciones de
 * tarjeta, saldos por indumentaria/accesorios/reparaciones).
 */
export async function getCuentasACobrar() {
  const cobros = await prisma.cuentaPorCobrar.findMany({
    where: { estado: "PENDIENTE", moneda: "ARS" },
    select: { monto: true, fechaVencimiento: true },
  })
  const total = cobros.reduce((a, c) => a + c.monto, 0)
  const now = new Date()
  const vencido = cobros
    .filter((c) => c.fechaVencimiento && new Date(c.fechaVencimiento) < now)
    .reduce((a, c) => a + c.monto, 0)
  return { total, vencido, cantidad: cobros.length }
}

/**
 * Créditos personales de clientes = financiaciones de OC con saldo pendiente.
 * Derivado de FinanciacionOC/cuotas (fuente única) → espejado con Tesorería.
 */
export async function getCreditosClientes() {
  const fins = await prisma.financiacionOC.findMany({
    where: { estado: { in: ["ACTIVA", "ATRASADA"] } },
    include: {
      cliente: { select: { nombre: true, apellido: true, telefono: true } },
      cuotas: { select: { estado: true, monto: true, montoPagado: true, fechaVencimiento: true } },
    },
  })
  const now = new Date()
  const items = fins
    .map((f) => {
      const pend = f.cuotas.filter((c) => c.estado !== "PAGADA" && c.estado !== "CANCELADA")
      // Saldo = lo que falta cobrar (descuenta pagos parciales).
      const saldo = pend.reduce((a, c) => a + (c.monto - c.montoPagado), 0)
      const prox = pend
        .slice()
        .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())[0]
      return {
        id: f.id,
        cliente: `${f.cliente.apellido}, ${f.cliente.nombre}`,
        telefono: f.cliente.telefono,
        moneda: f.moneda,
        saldo,
        proxFecha: prox?.fechaVencimiento ?? null,
        proxMonto: prox ? prox.monto - prox.montoPagado : null,
        vencido: !!prox && new Date(prox.fechaVencimiento) < now,
        cuotasPend: pend.length,
      }
    })
    .filter((i) => i.saldo > 0)
    .sort((a, b) => {
      const fa = a.proxFecha ? new Date(a.proxFecha).getTime() : Infinity
      const fb = b.proxFecha ? new Date(b.proxFecha).getTime() : Infinity
      return fa - fb
    })
  const totalArs = items.filter((i) => i.moneda === "ARS").reduce((a, i) => a + i.saldo, 0)
  const vencidoArs = items.filter((i) => i.vencido && i.moneda === "ARS").reduce((a, i) => a + i.saldo, 0)
  return { items, totalArs, vencidoArs }
}

/**
 * Detalle de cuentas a cobrar (estilo hoja "Cuentas a Plazo" del Excel):
 * por financiación, con monto pendiente, próximo vencimiento, tipo de crédito
 * (Bancario/Personal) y si está vencido.
 */
export async function getPorCobrarDetalle() {
  const cobros = await conReintento(() => prisma.cuentaPorCobrar.findMany({
    where: { estado: "PENDIENTE" },
    orderBy: [{ fechaVencimiento: "asc" }, { createdAt: "desc" }],
  }))
  const now = new Date()
  const items = cobros.map((c) => ({
    id: c.id,
    cliente: c.cliente,
    descripcion: c.descripcion || "",
    moneda: c.moneda,
    tipo: c.tipo,
    montoPendiente: c.monto,
    proxVenc: c.fechaVencimiento,
    vencido: !!c.fechaVencimiento && new Date(c.fechaVencimiento) < now,
  }))

  const total = items.filter((i) => i.moneda === "ARS").reduce((a, i) => a + i.montoPendiente, 0)
  const vencido = items.filter((i) => i.vencido && i.moneda === "ARS").reduce((a, i) => a + i.montoPendiente, 0)
  // Totales por tipo (solo ARS)
  const porTipo = new Map<string, number>()
  for (const i of items) if (i.moneda === "ARS") porTipo.set(i.tipo, (porTipo.get(i.tipo) ?? 0) + i.montoPendiente)
  const tipos = Array.from(porTipo.entries()).map(([tipo, monto]) => ({ tipo, monto })).sort((a, b) => b.monto - a.monto)

  return { items, total, vencido, tipos }
}

/**
 * Resumen completo de cuentas y cheques (a cobrar + a pagar + neto),
 * combinando cuentas a cobrar/pagar y cheques. Para la card del resumen general.
 */
export async function getResumenCuentasCheques() {
  const [cuentas, cheques] = await conReintento(() =>
    Promise.all([
      prisma.cuentaPorCobrar.findMany({ where: { estado: "PENDIENTE" } }),
      prisma.cheque.findMany({ where: { estado: "PENDIENTE" } }),
    ])
  )
  const now = new Date()
  const sumARS = (arr: { monto: number; moneda: string }[]) =>
    arr.filter((x) => x.moneda === "ARS").reduce((a, x) => a + x.monto, 0)

  const aCobrar = sumARS(cuentas.filter((c) => c.sentido === "COBRAR")) + sumARS(cheques.filter((c) => c.tipo === "A_COBRAR"))
  const aPagar = sumARS(cuentas.filter((c) => c.sentido === "PAGAR")) + sumARS(cheques.filter((c) => c.tipo === "A_PAGAR"))

  const items = [
    ...cuentas.map((c) => ({ dir: c.sentido === "COBRAR" ? "cobrar" : "pagar", label: c.cliente, sub: c.tipo, monto: c.monto, moneda: c.moneda, venc: c.fechaVencimiento })),
    ...cheques.map((c) => ({ dir: c.tipo === "A_COBRAR" ? "cobrar" : "pagar", label: c.beneficiario, sub: "Cheque", monto: c.monto, moneda: c.moneda, venc: c.fechaVencimiento })),
  ]
    .map((i) => ({ ...i, vencido: !!i.venc && new Date(i.venc) < now }))
    .sort((a, b) => (a.venc ? new Date(a.venc).getTime() : Infinity) - (b.venc ? new Date(b.venc).getTime() : Infinity))

  return { aCobrar, aPagar, neto: aCobrar - aPagar, items }
}

/**
 * Posición total: saldos en cuentas (ARS) + cuentas a cobrar + valor de stock.
 * Más el detalle de saldos USD por separado.
 */
export async function getPosicionTotal() {
  const [cuentas, movimientos, valorStock, porCobrar] = await conReintento(() =>
    Promise.all([
      prisma.cuentaFinanciera.findMany({ orderBy: { orden: "asc" } }),
      prisma.movimientoFinanciero.findMany({
        select: { cuentaId: true, tipo: true, monto: true },
      }),
      getValorStock(),
      getCuentasACobrar(),
    ])
  )

  const saldos = calcularSaldos(cuentas, movimientos)
  const saldosARS = saldos.filter((s) => s.cuenta.moneda === "ARS" && !s.cuenta.excluirDeResultado)
  const saldosUSD = saldos.filter((s) => s.cuenta.moneda === "USD")
  const cuentaPapa = saldos.filter((s) => s.cuenta.excluirDeResultado)

  const totalEnCuentasARS = saldosARS.reduce((a, s) => a + s.saldoActual, 0)
  const totalEnCuentasUSD = saldosUSD.reduce((a, s) => a + s.saldoActual, 0)

  const posicionTotal = totalEnCuentasARS + porCobrar.total + valorStock.valorTotal

  return {
    saldos,
    saldosARS,
    saldosUSD,
    cuentaPapa,
    totalEnCuentasARS,
    totalEnCuentasUSD,
    porCobrar,
    valorStock,
    posicionTotal,
  }
}

/**
 * Unidades vendidas por modelo en un mes/año (desde Stock Motos, no del Excel).
 * Mucho más confiable que contar descripciones de movimientos.
 */
export async function getUnidadesVendidasPorModelo(anio: number) {
  const vendidasRaw = await prisma.modelo.findMany({
    where: { vendida: true, fechaVenta: { not: null } },
    select: { nombre: true, marca: true, fechaVenta: true },
  })
  const vendidas = vendidasRaw.map((v) => ({
    modelo: `${v.marca || ""} ${v.nombre}`.trim(),
    fechaVenta: v.fechaVenta,
  }))
  // { modelo: [12 meses] }
  const mapa = new Map<string, number[]>()
  for (const v of vendidas) {
    if (!v.fechaVenta) continue
    const f = new Date(v.fechaVenta)
    if (f.getFullYear() !== anio) continue
    if (!mapa.has(v.modelo)) mapa.set(v.modelo, Array(12).fill(0))
    mapa.get(v.modelo)![f.getMonth()]++
  }
  return Array.from(mapa.entries())
    .map(([modelo, meses]) => ({ modelo, meses, total: meses.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
}

export type { SaldoCuenta }

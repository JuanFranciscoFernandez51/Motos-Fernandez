// Helpers para crear y sincronizar financiaciones desde Órdenes de Compra
import type { Prisma, PrismaClient } from "@prisma/client"

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

type OCParaFinanciacion = {
  id: string
  clienteId: string
  motoDescripcion: string
  formaPago: string | null
  cuotas: number | null
  valorCuota: number | null
  entrega: number | null
  // Capital efectivo a financiar. Si no viene, se infiere de
  // `cuotas * valorCuota + entrega` (comportamiento legacy).
  // Sirve para soportar planes con intereses donde cuotas*valor != capital.
  montoFinanciado?: number | null
  // Fecha de la cuota 1 (Date o YYYY-MM-DD). Si no viene, default = mes
  // siguiente, dia 10. Las cuotas siguientes son +1 mes desde la 1.
  fechaPrimeraCuota?: Date | string | null
  precioVenta: number
  moneda: string
  // Garante (opcional, datos texto libre)
  garanteNombre?: string | null
  garanteApellido?: string | null
  garanteDni?: string | null
  garanteTelefono?: string | null
  garanteDireccion?: string | null
}

/**
 * Determina si una OC requiere crear una financiación.
 * Basta con que tenga cuotas y valorCuota válidos — la formaPago se
 * calcula sola ahora, no la usamos como gate.
 */
export function requiereFinanciacion(oc: OCParaFinanciacion): boolean {
  if (!oc.cuotas || oc.cuotas <= 0) return false
  if (!oc.valorCuota || oc.valorCuota <= 0) return false
  return true
}

/**
 * Genera la fecha de vencimiento de una cuota.
 * - mes 1 = mes siguiente al de inicio
 * - dia = diaVencimiento (default 10)
 */
export function calcularVencimientoCuota(
  fechaInicio: Date,
  numeroCuota: number,
  diaVencimiento: number = 10
): Date {
  const f = new Date(fechaInicio)
  f.setMonth(f.getMonth() + numeroCuota)
  f.setDate(diaVencimiento)
  f.setHours(0, 0, 0, 0)
  return f
}

/**
 * Crea una financiación + cuotas a partir de una OC dentro de una transaction.
 * Si ya existe una financiación para esta OC, no hace nada (idempotente).
 */
export async function crearFinanciacionDesdeOC(
  tx: TxClient | Prisma.TransactionClient,
  oc: OCParaFinanciacion,
  diaVencimiento: number = 10
) {
  if (!requiereFinanciacion(oc)) return null

  // Idempotencia: si ya hay una, no duplicar
  const existente = await tx.financiacionOC.findUnique({
    where: { ordenCompraId: oc.id },
  })
  if (existente) return existente

  const cantidadCuotas = oc.cuotas as number
  const valorCuota = oc.valorCuota as number
  const entrega = oc.entrega ?? 0
  // Capital (lo que efectivamente cuadra contra el precio): si el admin
  // lo cargo explicito, usamos ese. Si no, fallback a cuotas*valor + entrega
  // (= asumimos sin intereses).
  const montoTotal =
    oc.montoFinanciado && oc.montoFinanciado > 0
      ? oc.montoFinanciado
      : valorCuota * cantidadCuotas + entrega

  // Fecha de la cuota 1: si el admin la cargó, la usamos; si no, mes
  // siguiente a hoy con el día `diaVencimiento` (legacy, default 10).
  // Las cuotas 2..N son +1 mes cada una desde la fecha de la 1.
  const fechaInicio = new Date()
  const fecha1: Date = (() => {
    if (oc.fechaPrimeraCuota) {
      const d = new Date(oc.fechaPrimeraCuota)
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0)
        return d
      }
    }
    return calcularVencimientoCuota(fechaInicio, 1, diaVencimiento)
  })()
  const diaCuota = fecha1.getDate()
  const fechaFin = calcularVencimientoCuotaDesde(fecha1, cantidadCuotas - 1)

  const financiacion = await tx.financiacionOC.create({
    data: {
      ordenCompraId: oc.id,
      clienteId: oc.clienteId,
      descripcion: oc.motoDescripcion,
      origen: "OC_AUTOMATICA",
      montoTotal,
      entrega,
      cantidadCuotas,
      valorCuota,
      moneda: oc.moneda,
      fechaInicio,
      fechaFin,
      // Guardamos el día de la cuota 1 para que en re-cálculos futuros
      // se mantenga (ej: si una cuota nueva se genera por reestructuración).
      diaVencimiento: diaCuota,
      estado: "ACTIVA",
      // Garante (opcional)
      garanteNombre: oc.garanteNombre ?? null,
      garanteApellido: oc.garanteApellido ?? null,
      garanteDni: oc.garanteDni ?? null,
      garanteTelefono: oc.garanteTelefono ?? null,
      garanteDireccion: oc.garanteDireccion ?? null,
    },
  })

  // Crear todas las cuotas: 1 = fecha1, 2..N = +i meses
  const cuotasData = Array.from({ length: cantidadCuotas }, (_, i) => ({
    financiacionId: financiacion.id,
    numero: i + 1,
    monto: valorCuota,
    fechaVencimiento: calcularVencimientoCuotaDesde(fecha1, i),
    estado: "PENDIENTE" as const,
  }))

  await tx.cuotaFinanciacion.createMany({ data: cuotasData })

  return financiacion
}

/**
 * Suma N meses a una fecha base manteniendo el día. Se usa para generar
 * cuotas 2..N a partir de la fecha de la cuota 1.
 */
function calcularVencimientoCuotaDesde(fechaBase: Date, mesesAdicionales: number): Date {
  const f = new Date(fechaBase)
  f.setMonth(f.getMonth() + mesesAdicionales)
  f.setHours(0, 0, 0, 0)
  return f
}

/**
 * Marca cuotas como ATRASADA si su fechaVencimiento ya pasó y siguen PENDIENTE.
 * Y marca financiaciones como ATRASADA si tienen cuotas atrasadas.
 * Llamar antes de listar para mantener estados al día.
 */
export async function actualizarEstadosVencidos(tx: TxClient) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Cuotas pendientes con vencimiento pasado → ATRASADA
  await tx.cuotaFinanciacion.updateMany({
    where: {
      estado: "PENDIENTE",
      fechaVencimiento: { lt: now },
    },
    data: { estado: "ATRASADA" },
  })

  // Financiaciones con al menos 1 cuota atrasada → ATRASADA
  const conAtraso = await tx.financiacionOC.findMany({
    where: {
      estado: "ACTIVA",
      cuotas: { some: { estado: "ATRASADA" } },
    },
    select: { id: true },
  })
  if (conAtraso.length > 0) {
    await tx.financiacionOC.updateMany({
      where: { id: { in: conAtraso.map((f) => f.id) } },
      data: { estado: "ATRASADA" },
    })
  }
}

/**
 * Cobra (marca pagada) la PRÓXIMA cuota pendiente/atrasada de una financiación.
 * Fuente única de verdad usada por Tesorería (Créditos personales) y por
 * Finanzas (Cuentas y cheques), para que el cobro quede espejado en ambos lados.
 * Recalcula el estado de la financiación y cancela los avisos pendientes.
 * Devuelve la cuota cobrada (monto, número) o null si no había pendientes.
 */
export async function cobrarProximaCuota(
  db: TxClient,
  financiacionId: string,
  opts?: { metodoPago?: string; fechaPago?: Date }
): Promise<{ numero: number; monto: number } | null> {
  const proxima = await db.cuotaFinanciacion.findFirst({
    where: { financiacionId, estado: { in: ["PENDIENTE", "PARCIAL", "ATRASADA"] } },
    orderBy: { fechaVencimiento: "asc" },
    select: { id: true, numero: true, monto: true },
  })
  if (!proxima) return null

  // Cobro inline = se salda la cuota completa (montoPagado = monto).
  await db.cuotaFinanciacion.update({
    where: { id: proxima.id },
    data: {
      estado: "PAGADA",
      montoPagado: proxima.monto,
      fechaPago: opts?.fechaPago ?? new Date(),
      metodoPago: opts?.metodoPago ?? "Efectivo",
    },
  })
  await db.outreachTarea.updateMany({
    where: { cuotaId: proxima.id, estado: "PROGRAMADA" },
    data: {
      estado: "DESCARTADA",
      descartadaAt: new Date(),
      notaInterna: "Cancelada automaticamente: la cuota fue pagada.",
    },
  })
  const all = await db.cuotaFinanciacion.findMany({
    where: { financiacionId },
    select: { estado: true },
  })
  const allPagadas = all.every((c) => c.estado === "PAGADA" || c.estado === "CANCELADA")
  const hayAtrasada = all.some((c) => c.estado === "ATRASADA")
  await db.financiacionOC.update({
    where: { id: financiacionId },
    data: { estado: allPagadas ? "COMPLETADA" : hayAtrasada ? "ATRASADA" : "ACTIVA" },
  })
  return { numero: proxima.numero, monto: proxima.monto }
}

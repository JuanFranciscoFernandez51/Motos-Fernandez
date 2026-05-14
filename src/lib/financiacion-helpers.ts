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
  const fechaInicio = new Date()
  const fechaFin = calcularVencimientoCuota(fechaInicio, cantidadCuotas, diaVencimiento)

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
      diaVencimiento,
      estado: "ACTIVA",
      // Garante (opcional)
      garanteNombre: oc.garanteNombre ?? null,
      garanteApellido: oc.garanteApellido ?? null,
      garanteDni: oc.garanteDni ?? null,
      garanteTelefono: oc.garanteTelefono ?? null,
      garanteDireccion: oc.garanteDireccion ?? null,
    },
  })

  // Crear todas las cuotas
  const cuotasData = Array.from({ length: cantidadCuotas }, (_, i) => ({
    financiacionId: financiacion.id,
    numero: i + 1,
    monto: valorCuota,
    fechaVencimiento: calcularVencimientoCuota(fechaInicio, i + 1, diaVencimiento),
    estado: "PENDIENTE" as const,
  }))

  await tx.cuotaFinanciacion.createMany({ data: cuotasData })

  return financiacion
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

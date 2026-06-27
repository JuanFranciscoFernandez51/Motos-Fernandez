import type { PrismaClient } from "@prisma/client"

type DB = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

/**
 * Sugiere la ganancia bruta de una venta (OC):
 * - Propia: precio de venta − valor de toma (lo que costó). null si no hay costo.
 * - Consignación: comisión pactada (monto) / precio − precio mínimo del dueño /
 *   % pactado / 5% por defecto (la pauta).
 * Es solo una sugerencia: el valor real se guarda en OC.gananciaBruta y es editable.
 */
export async function calcularGananciaBrutaSugerida(
  db: DB,
  ordenCompraId: string
): Promise<number | null> {
  const oc = await db.ordenCompra.findUnique({
    where: { id: ordenCompraId },
    select: {
      precioVenta: true,
      modelo: { select: { origen: true, valorToma: true } },
      mandato: { select: { precioMinimo: true, comisionPorc: true, comisionMonto: true } },
    },
  })
  if (!oc) return null
  const precio = oc.precioVenta || 0

  const esConsignacion = oc.modelo?.origen === "MANDATO" || !!oc.mandato
  if (esConsignacion) {
    const m = oc.mandato
    if (m?.comisionMonto) return m.comisionMonto
    if (m?.precioMinimo) return Math.max(0, precio - m.precioMinimo)
    if (m?.comisionPorc) return Math.round(precio * (m.comisionPorc / 100))
    return Math.round(precio * 0.05) // pauta: 5% del precio de venta
  }

  // Moto propia
  if (oc.modelo?.valorToma != null) return precio - oc.modelo.valorToma
  return null // sin costo cargado → queda a completar a mano
}

/**
 * Si la OC está concretada y no tiene gananciaBruta cargada, le pone la
 * sugerencia automática. No pisa un valor ya editado por el usuario.
 */
export async function autoCargarGananciaBruta(db: DB, ordenCompraId: string): Promise<void> {
  const oc = await db.ordenCompra.findUnique({
    where: { id: ordenCompraId },
    select: { estado: true, gananciaBruta: true },
  })
  if (!oc || oc.estado !== "CONCRETADA" || oc.gananciaBruta != null) return
  const sugerida = await calcularGananciaBrutaSugerida(db, ordenCompraId)
  if (sugerida != null) {
    await db.ordenCompra.update({ where: { id: ordenCompraId }, data: { gananciaBruta: sugerida } })
  }
}

/**
 * Ganancia bruta promedio REAL de las últimas N ventas concretadas (ARS) con
 * gananciaBruta cargada. Alimenta el breakeven sin estimar a ojo.
 */
export async function getMargenPromedioReal(
  db: DB,
  ultimas = 30
): Promise<{ promedio: number; cantidad: number }> {
  const ocs = await db.ordenCompra.findMany({
    where: { estado: "CONCRETADA", moneda: "ARS", gananciaBruta: { not: null } },
    orderBy: { fecha: "desc" },
    take: ultimas,
    select: { gananciaBruta: true },
  })
  if (ocs.length === 0) return { promedio: 0, cantidad: 0 }
  const suma = ocs.reduce((a, o) => a + (o.gananciaBruta || 0), 0)
  return { promedio: Math.round(suma / ocs.length), cantidad: ocs.length }
}

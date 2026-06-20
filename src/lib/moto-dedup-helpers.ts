import type { Prisma, PrismaClient } from "@prisma/client"

/**
 * Anti-duplicados: busca una moto YA cargada en stock (no vendida, no archivada)
 * que coincida por chasis, motor o patente. Sirve para evitar crear una moto
 * duplicada cuando se toma en parte de pago una unidad que ya estaba en el stock
 * (el caso de la BMW: se tomó en OC y se creó una copia en vez de usar la existente).
 *
 * Devuelve la moto existente o null. Compara case-insensitive sobre el valor
 * trimmeado; ignora identificadores vacíos.
 */
export async function buscarMotoExistentePorIdentificadores(
  db: Prisma.TransactionClient | PrismaClient,
  ids: { chasis?: string | null; motor?: string | null; patente?: string | null }
): Promise<{ id: string; codigo: string | null; nombre: string } | null> {
  const limpio = (s?: string | null) => {
    const v = (s || "").trim()
    return v.length >= 4 ? v : null // muy corto = no es un identificador confiable
  }
  const chasis = limpio(ids.chasis)
  const motor = limpio(ids.motor)
  const patente = limpio(ids.patente)

  const ors: Prisma.ModeloWhereInput[] = []
  if (chasis) ors.push({ chasis: { equals: chasis, mode: "insensitive" } })
  if (motor) ors.push({ motor: { equals: motor, mode: "insensitive" } })
  if (patente) ors.push({ patente: { equals: patente, mode: "insensitive" } })
  if (ors.length === 0) return null

  return db.modelo.findFirst({
    where: { vendida: false, archivada: false, OR: ors },
    select: { id: true, codigo: true, nombre: true },
  })
}

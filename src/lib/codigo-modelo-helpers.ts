import type { Prisma } from "@prisma/client"

/**
 * Genera el próximo código operativo para un Modelo según su tipo:
 *
 * - **0KM padre** (modelo del catálogo nuevo, sin modeloOrigenId):
 *   `MF-0KM-0001`, `-0002`, etc. Secuencia propia.
 *
 * - **USADA / parte de pago / unidad vendida** (todo el resto):
 *   `MF-0001`, `MF-0002`, etc. Secuencia compartida.
 *
 * Se llama dentro de la misma $transaction de creación para que no haya
 * race conditions (dos creaciones simultáneas no pueden tomar el mismo
 * número porque el helper hace findMany del prefix actual + max + 1).
 *
 * Si el cálculo falla por alguna razón, devuelve null y dejamos que el
 * caller decida (en general, omitir el código y completarlo manual).
 */
export async function generarCodigoModelo(
  tx: Prisma.TransactionClient,
  args: { condicion: string | null; esClon?: boolean }
): Promise<string> {
  // Padre 0KM (stock disponible) → MF-0KM-NNNN.
  // Clon (unidad vendida) y todo lo demás → MF-NNNN.
  const prefix = args.condicion === "0KM" && !args.esClon ? "MF-0KM-" : "MF-"
  const existentes = await tx.modelo.findMany({
    where: { codigo: { startsWith: prefix } },
    select: { codigo: true },
  })
  // Extraer el número final de cada código existente que matchee el formato
  const numeros = existentes
    .map((m) => {
      if (!m.codigo) return 0
      const match = m.codigo.match(new RegExp(`^${prefix}(\\d+)$`))
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
  return `${prefix}${String(proximo).padStart(4, "0")}`
}

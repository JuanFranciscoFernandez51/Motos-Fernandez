import type { Prisma } from "@prisma/client"
import { generarCodigoModelo } from "./codigo-modelo-helpers"

/**
 * Maneja la venta de un Modelo del catálogo. Comportamiento distinto
 * según condición:
 *
 * - **0KM**: clona el Modelo padre como "unidad vendida" — mismos datos
 *   + chasis/motor/patente específicos de la unidad + vendida=true +
 *   linkeado a la OC. El padre queda intacto (sigue activo en stock).
 *   Devuelve el clon creado.
 *
 * - **USADA** (o sin condición clara): marca el modelo original como
 *   vendida, fechaVenta, activo=false (comportamiento histórico).
 *
 * Si la moto YA está marcada como vendida (o no existe), no hace nada.
 *
 * Side-effects (despublicar en ML, editar caption IG/FB) se manejan
 * en el caller — esta función solo toca la DB.
 */
export async function manejarVentaDeMoto(
  tx: Prisma.TransactionClient,
  args: {
    modeloId: string
    clienteId?: string | null
    ordenCompraId?: string | null
    fechaVenta?: Date
    chasis?: string | null
    motor?: string | null
    patente?: string | null
  }
): Promise<{
  modeloIdFinal: string // el id de la moto que quedó marcada como vendida (puede ser el clon o el original)
  esClon: boolean
}> {
  const m = await tx.modelo.findUnique({
    where: { id: args.modeloId },
    select: {
      id: true,
      condicion: true,
      vendida: true,
      nombre: true,
      slug: true,
      marca: true,
      categoriaVehiculo: true,
      anio: true,
      kilometros: true,
      cilindrada: true,
      transmision: true,
      combustible: true,
      color: true,
      precio: true,
      moneda: true,
      descripcion: true,
      observaciones: true,
      fotos: true,
      etiqueta: true,
      orden: true,
    },
  })

  if (!m) {
    // La moto no existe — devolvemos el id original como fallback,
    // el caller decidirá si tirar error.
    return { modeloIdFinal: args.modeloId, esClon: false }
  }

  if (m.vendida) {
    // Ya está vendida — no duplicar acción
    return { modeloIdFinal: args.modeloId, esClon: false }
  }

  const fecha = args.fechaVenta || new Date()

  if (m.condicion === "0KM") {
    // 0KM → clonar como unidad vendida. El padre queda intacto.
    // Generar slug único agregando -uN al original.
    const baseSlug = `${m.slug}-u`
    const existentes = await tx.modelo.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    })
    const numeros = existentes
      .map((e) => {
        const match = e.slug.match(new RegExp(`^${baseSlug}(\\d+)$`))
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((n) => n > 0)
    const proximoN = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
    const slugClon = `${baseSlug}${proximoN}`
    const codigoClon = await generarCodigoModelo(tx, {
      condicion: m.condicion,
      esClon: true,
    })

    const clon = await tx.modelo.create({
      data: {
        nombre: m.nombre,
        slug: slugClon,
        codigo: codigoClon,
        marca: m.marca,
        categoriaVehiculo: m.categoriaVehiculo,
        condicion: m.condicion,
        anio: m.anio,
        kilometros: m.kilometros,
        cilindrada: m.cilindrada,
        transmision: m.transmision,
        combustible: m.combustible,
        color: m.color,
        precio: m.precio,
        moneda: m.moneda,
        descripcion: m.descripcion,
        observaciones: m.observaciones,
        fotos: m.fotos,
        etiqueta: null,
        orden: m.orden,
        // Identidad de unidad vendida
        chasis: args.chasis ?? null,
        motor: args.motor ?? null,
        patente: args.patente ?? null,
        // Estado: vendida + inactiva (no aparece en catálogo público)
        vendida: true,
        fechaVenta: fecha,
        activo: false,
        // Trazabilidad
        origen: "UNIDAD_VENDIDA_0KM",
        modeloOrigenId: m.id,
        ordenCompraVentaId: args.ordenCompraId ?? null,
      },
    })
    return { modeloIdFinal: clon.id, esClon: true }
  }

  // Usada (o cualquier otra condición): comportamiento histórico
  await tx.modelo.update({
    where: { id: m.id },
    data: {
      vendida: true,
      fechaVenta: fecha,
      activo: false,
      // Si llegó chasis/motor/patente nuevos en la OC, los guardamos en la usada
      ...(args.chasis !== undefined ? { chasis: args.chasis } : {}),
      ...(args.motor !== undefined ? { motor: args.motor } : {}),
      ...(args.patente !== undefined ? { patente: args.patente } : {}),
    },
  })
  return { modeloIdFinal: m.id, esClon: false }
}

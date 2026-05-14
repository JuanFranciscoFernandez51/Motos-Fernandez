import type { Prisma } from "@prisma/client"
import { generarCodigoModelo } from "./codigo-modelo-helpers"

/**
 * Genera un slug único derivado de `base` que no choque con otros slugs
 * existentes. Usa la convención `base`, `base-2`, `base-3`, etc.
 */
async function siguienteSlug(
  tx: Prisma.TransactionClient,
  base: string
): Promise<string> {
  const slug = base.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
  const existentes = await tx.modelo.findMany({
    where: { slug: { startsWith: slug } },
    select: { slug: true },
  })
  if (!existentes.find((e) => e.slug === slug)) return slug || "moto"
  const numeros = existentes
    .map((e) => {
      const m = e.slug.match(new RegExp(`^${slug}-(\\d+)$`))
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const n = numeros.length > 0 ? Math.max(...numeros) + 1 : 2
  return `${slug}-${n}`
}

/**
 * Crea un Modelo "post-mortem" para una OC concretada que no tiene
 * modeloId (la moto se cargó solo con motoDescripcion en la OC, sin
 * elegir/crear modelo en el catálogo).
 *
 * El modelo se crea como USADA, `vendida=true`, `activo=false` (no aparece
 * en el catálogo público) y linkeado a la OC. Esto garantiza que la
 * venta aparezca en /admin/stock-motos pestaña "Vendidas" para que la
 * administración la vea.
 *
 * Si la OC ya tiene un modelo asociado a ordenCompraVentaId, NO crea
 * duplicado y devuelve el existente.
 */
export async function crearModeloDesdeOCSinModelo(
  tx: Prisma.TransactionClient,
  oc: {
    id: string
    motoDescripcion: string
    motoAnio?: number | null
    motoKilometros?: number | null
    motoChasis?: string | null
    motoMotor?: string | null
    motoPatente?: string | null
    precioVenta: number
    moneda: string
    fecha: Date
  }
): Promise<string> {
  // Idempotencia: si ya hay un modelo con esta OC como ventaId, devolverlo
  const existente = await tx.modelo.findFirst({
    where: { ordenCompraVentaId: oc.id },
    select: { id: true },
  })
  if (existente) return existente.id

  const desc = (oc.motoDescripcion || "").trim()
  const partes = desc.split(/\s+/).filter(Boolean)
  const marca = partes[0] || "Sin marca"
  const nombre = partes.slice(1).join(" ") || desc || "Sin modelo"

  const slug = await siguienteSlug(tx, `${marca}-${nombre}-vendida`)
  const codigo = await generarCodigoModelo(tx, { condicion: "USADA" })

  const creado = await tx.modelo.create({
    data: {
      nombre,
      slug,
      codigo,
      marca,
      condicion: "USADA",
      anio: oc.motoAnio ?? null,
      kilometros: oc.motoKilometros ?? null,
      chasis: oc.motoChasis ?? null,
      motor: oc.motoMotor ?? null,
      patente: oc.motoPatente ?? null,
      precio: oc.precioVenta,
      moneda: oc.moneda,
      fotos: [],
      vendida: true,
      fechaVenta: oc.fecha,
      activo: false,
      origen: "STOCK_PROPIO",
      ordenCompraVentaId: oc.id,
    },
    select: { id: true },
  })
  // Linkear la OC al nuevo modelo
  await tx.ordenCompra.update({
    where: { id: oc.id },
    data: { modeloId: creado.id },
  })
  return creado.id
}

/**
 * Sincroniza todas las consecuencias de una venta de moto:
 *  - Modelo: vendida=true, activo=false, fechaVenta, etiqueta=null
 *  - Mandato asociado (si lo hay): estado=VENDIDO
 *  - ML: si esta active → marcamos mlEstado=paused para que el cron luego
 *    sincronice con Mercado Libre (no podemos llamar la API de ML desde
 *    una transaccion porque tardaria mucho)
 *  - OC vinculada: si se pasa, queda registrada como ordenCompraVentaId
 *
 * Es IDEMPOTENTE: si la moto ya esta vendida, igual sincroniza el resto
 * (por si quedó algo desincronizado).
 *
 * Esta es la fuente unica de verdad para "marcar como vendida" — todo
 * flujo (OC concretada, estado de mandato a VENDIDO, toggle manual en
 * admin) debe llamar esta funcion para que las consecuencias sean
 * consistentes.
 */
export async function marcarModeloComoVendido(
  tx: Prisma.TransactionClient,
  args: {
    modeloId: string
    ordenCompraId?: string | null
    fechaVenta?: Date
    chasis?: string | null
    motor?: string | null
    patente?: string | null
  }
): Promise<void> {
  const m = await tx.modelo.findUnique({
    where: { id: args.modeloId },
    select: {
      id: true,
      vendida: true,
      mlListingId: true,
      mlEstado: true,
      mandato: { select: { id: true, estado: true } },
    },
  })
  if (!m) return
  const fecha = args.fechaVenta || new Date()

  await tx.modelo.update({
    where: { id: m.id },
    data: {
      vendida: true,
      activo: false,
      etiqueta: null,
      fechaVenta: fecha,
      ...(args.chasis !== undefined ? { chasis: args.chasis } : {}),
      ...(args.motor !== undefined ? { motor: args.motor } : {}),
      ...(args.patente !== undefined ? { patente: args.patente } : {}),
      ...(args.ordenCompraId ? { ordenCompraVentaId: args.ordenCompraId } : {}),
      // Pausar publicacion ML para que el cron lo despublique
      ...(m.mlListingId && m.mlEstado === "active"
        ? { mlEstado: "paused" }
        : {}),
    },
  })

  // Sincronizar mandato a VENDIDO si tiene uno y no esta ya VENDIDO
  if (m.mandato && m.mandato.estado !== "VENDIDO") {
    await tx.mandatoVenta.update({
      where: { id: m.mandato.id },
      data: { estado: "VENDIDO" },
    })
  }
}

/**
 * Sincroniza desde el lado del mandato: cuando un mandato pasa a VENDIDO,
 * marcamos el modelo asociado como vendida con todos los side effects.
 */
export async function sincronizarMandatoVendido(
  tx: Prisma.TransactionClient,
  args: { mandatoId: string; fechaVenta?: Date }
): Promise<void> {
  const mv = await tx.mandatoVenta.findUnique({
    where: { id: args.mandatoId },
    select: { id: true, estado: true, modeloId: true, ordenCompraId: true },
  })
  if (!mv) return
  if (mv.estado !== "VENDIDO") {
    await tx.mandatoVenta.update({
      where: { id: mv.id },
      data: { estado: "VENDIDO" },
    })
  }
  if (mv.modeloId) {
    await marcarModeloComoVendido(tx, {
      modeloId: mv.modeloId,
      ordenCompraId: mv.ordenCompraId,
      fechaVenta: args.fechaVenta,
    })
  }
}

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

  // Usada (o cualquier otra condición): comportamiento histórico —
  // ahora delegamos al helper centralizado para que tambien sincronice
  // mandato (VENDIDO) y pause ML automaticamente.
  await marcarModeloComoVendido(tx, {
    modeloId: m.id,
    ordenCompraId: args.ordenCompraId,
    fechaVenta: fecha,
    chasis: args.chasis,
    motor: args.motor,
    patente: args.patente,
  })
  return { modeloIdFinal: m.id, esClon: false }
}

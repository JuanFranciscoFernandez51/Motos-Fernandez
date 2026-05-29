import type { Prisma } from "@prisma/client"
import { generarCodigoModelo } from "@/lib/codigo-modelo-helpers"

/**
 * Crea (o sincroniza) automaticamente un MandatoVenta cuando se toma una
 * permuta en una OC. Justificacion: la moto pasa al inventario y necesitamos
 * trackearla con precio minimo (= valor de toma) y precio sugerido al
 * publico — mismo flujo que cuando un cliente consigna su moto.
 *
 * Es IDEMPOTENTE: si ya existe un mandato para esta permuta (linkeado via
 * `ocPermutaId`), lo actualiza en lugar de crear duplicado. Esto permite
 * llamar el helper repetidamente sin problemas (ej: al editar una OC).
 *
 * - Estado: ACTIVO (la moto ya esta disponible para venta).
 * - Cliente: el que entrego la permuta (ex-dueno, queda como traza).
 * - Moneda: la de la permuta (puede diferir de la moneda de la OC).
 * - Precio minimo: el valor de toma (lo que se descontó de la OC).
 * - Precio venta: arranca igual al minimo — el admin lo ajusta despues con
 *   margen. Si valor=0 (permuta gratis / sin valor declarado) tambien se
 *   crea el mandato igual, con precio 0 para que el admin lo cargue a mano.
 * - Documentacion: mapea desde el checklist de OCPermuta lo que este.
 *
 * Se llama dentro del mismo $transaction de la OC para que sea atomico.
 *
 * Devuelve el mandato (creado o actualizado) o null si no hay datos minimos
 * para armarlo (sin marca ni modelo no podemos crear un mandato util).
 */
export async function crearMandatoDesdePermuta(
  tx: Prisma.TransactionClient,
  args: {
    ocPermutaId: string  // ← obligatorio para idempotencia
    clienteId: string
    ordenCompraId: string
    modeloId: string | null // moto del catalogo asociada (si se creó)
    fecha: Date
    moneda: string
    permuta: {
      marca: string | null
      modelo: string | null
      anio?: number | null
      kilometros?: number | null
      patente?: string | null
      chasis?: string | null
      motor?: string | null
      descripcion?: string | null
      valor: number
      tieneTitulo?: boolean
      tieneManual?: boolean
      tieneSegundaLlave?: boolean
      tieneVtv?: boolean
      accesoriosExtra?: string | null
    }
  }
) {
  const { permuta } = args

  // Sin marca/modelo no podemos hacer un mandato util — saltamos.
  if (!permuta.marca || !permuta.modelo) return null

  // El valor puede ser 0 (permuta sin valor declarado, "regalo") — igual
  // creamos el mandato para que el admin pueda cargarle un precio despues.
  const valor = Math.max(0, permuta.valor || 0)

  // Notas: copiamos el resto del checklist que no entra en los booleans
  // especificos del schema MandatoVenta (casco, seguro, factura, etc).
  const extrasTxt: string[] = []
  if (permuta.descripcion) extrasTxt.push(permuta.descripcion)
  if (permuta.accesoriosExtra) extrasTxt.push(`Accesorios: ${permuta.accesoriosExtra}`)
  const observaciones =
    extrasTxt.length > 0
      ? `Generado automaticamente al tomar como parte de pago.\n\n${extrasTxt.join("\n")}`
      : "Generado automaticamente al tomar como parte de pago."

  // Datos comunes a create/update
  const data = {
    clienteId: args.clienteId,
    fechaFirma: args.fecha,
    estado: "ACTIVO" as const,
    marca: permuta.marca,
    modelo: permuta.modelo,
    anio: permuta.anio ?? null,
    kilometros: permuta.kilometros ?? null,
    chasis: permuta.chasis ?? null,
    motor: permuta.motor ?? null,
    patente: permuta.patente ?? null,
    tieneTitulo: !!permuta.tieneTitulo,
    tieneManual: !!permuta.tieneManual,
    tieneSegundaLlave: !!permuta.tieneSegundaLlave,
    tieneVTV: !!permuta.tieneVtv,
    precioVenta: valor,
    precioMinimo: valor,
    moneda: args.moneda,
    modeloId: args.modeloId,
    observaciones,
  }

  // Idempotente: si ya existe un mandato para esta permuta, lo updateamos.
  const existente = await tx.mandatoVenta.findUnique({
    where: { ocPermutaId: args.ocPermutaId },
  })

  if (existente) {
    // No pisamos `precioVenta` si el admin lo modifico (ya no es igual al
    // valor original = se cargo un margen). Si era igual al precioMinimo
    // viejo, lo sincronizamos al nuevo.
    const adminTocoPrecio =
      existente.precioVenta !== existente.precioMinimo
    const precioVenta = adminTocoPrecio ? existente.precioVenta : valor
    return tx.mandatoVenta.update({
      where: { id: existente.id },
      data: { ...data, precioVenta },
    })
  }

  return tx.mandatoVenta.create({
    data: {
      ...data,
      ocPermutaId: args.ocPermutaId,
      fotos: [],
    },
  })
}

/**
 * Campos que viajan del MandatoVenta → Modelo del catálogo. Centralizado
 * para que `publicarDesdeLista`, `publicarEnCatalogo` y los resyncs
 * (cuando el admin edita el mandato) usen exactamente el mismo set y no
 * se pierda nada por el camino. Bug histórico: faltaba `color`.
 *
 * No incluye `nombre`, `slug`, `codigo`, `categoriaVehiculo`, `condicion`,
 * `origen` ni `clienteEntregaId` porque eso lo decide cada caller (depende
 * del contexto: creación inicial vs sincronización).
 */
type MandatoSyncable = {
  marca: string
  modelo: string
  anio: number | null
  kilometros: number | null
  cilindrada: string | null
  color: string | null
  chasis: string | null
  motor: string | null
  patente: string | null
  precioVenta: number
  moneda: string
  fotos: string[]
  observaciones: string | null
  tipoTenencia: string
}

/**
 * Idempotente: si el mandato ya tiene `modeloId` (ya fue publicado),
 * devuelve { ok: true, alreadyPublished: true } sin hacer nada. Sino
 * crea el Modelo en el catálogo con todos los datos del mandato.
 *
 * Decisión de UX:
 * - El Modelo entra a **Stock motos** automáticamente (campo `activo`
 *   no afecta a stock — eso se filtra por `archivada`/`vendida`).
 * - El Modelo aparece en el **catálogo público** solo si el mandato
 *   ya tiene fotos cargadas. Sin fotos → `activo=false` para no
 *   exponer al cliente un placeholder feo. Cuando el admin sume
 *   fotos y haga "Resync" (o se vuelva a publicar), pasa a activo=true.
 *
 * Llamar dentro de la misma transacción que el create/update del
 * mandato cuando se quiere atómico, o por fuera si se acepta best-
 * effort.
 */
export async function publicarMandatoEnCatalogoSiCorresponde(
  tx: Prisma.TransactionClient,
  mandatoId: string
): Promise<
  | { ok: true; alreadyPublished: true; modeloId: string }
  | { ok: true; created: true; modeloId: string; codigo: string }
  | { ok: false; error: string }
> {
  const mandato = await tx.mandatoVenta.findUnique({
    where: { id: mandatoId },
    include: { cliente: true },
  })
  if (!mandato) return { ok: false, error: "Mandato no encontrado" }
  if (mandato.modeloId)
    return { ok: true, alreadyPublished: true, modeloId: mandato.modeloId }

  // Slug determinista a partir de marca + modelo + número de mandato
  const baseSlug = `${mandato.marca}-${mandato.modelo}-mv${mandato.numero}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const codigo = await generarCodigoModelo(tx, { condicion: "USADA" })

  // Decisión de activo: solo si tiene fotos reales subidas. Si vino
  // sin fotos, queda inactivo y el admin lo activa después.
  const tieneFotos = mandato.fotos.length > 0
  const fotos = tieneFotos ? mandato.fotos : ["/images/logo-clasico.png"]

  const modelo = await tx.modelo.create({
    data: {
      nombre: `${mandato.marca} ${mandato.modelo}`,
      slug: baseSlug,
      codigo,
      marca: mandato.marca,
      categoriaVehiculo: "MOTOCICLETA",
      condicion: "USADA",
      activo: tieneFotos, // ← clave: público solo si hay fotos
      origen: "MANDATO",
      clienteEntregaId: mandato.clienteId,
      clienteNombre: `${mandato.cliente.apellido}, ${mandato.cliente.nombre}`,
      clienteContacto:
        mandato.cliente.telefono || mandato.cliente.email || null,
      // Mapea año, km, color, chasis, motor, patente, precio, moneda,
      // observaciones, tipoTenencia desde el mandato (helper compartido).
      ...mapMandatoToModeloData(mandato, { incluirFotos: false }),
      fotos,
    },
  })

  await tx.mandatoVenta.update({
    where: { id: mandatoId },
    data: { modeloId: modelo.id, estado: "ACTIVO" },
  })

  return { ok: true, created: true, modeloId: modelo.id, codigo }
}

export function mapMandatoToModeloData(
  mandato: MandatoSyncable,
  opciones: { incluirFotos?: boolean } = {}
) {
  const incluirFotos = opciones.incluirFotos ?? true
  return {
    anio: mandato.anio,
    kilometros: mandato.kilometros,
    cilindrada: mandato.cilindrada,
    color: mandato.color, // ← lo que faltaba al publicar
    chasis: mandato.chasis,
    motor: mandato.motor,
    patente: mandato.patente,
    precio: mandato.precioVenta,
    moneda: mandato.moneda,
    notasInternas: mandato.observaciones,
    tipoTenencia: mandato.tipoTenencia,
    ...(incluirFotos && mandato.fotos.length > 0
      ? { fotos: mandato.fotos }
      : {}),
  }
}


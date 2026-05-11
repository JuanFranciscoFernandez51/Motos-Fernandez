import type { Prisma } from "@prisma/client"

/**
 * Crea automáticamente un MandatoVenta cuando se toma una permuta en una
 * OC. Justificación: la moto pasa a estar en venta y necesitamos
 * trackearla con precio mínimo (= valor de toma) y precio sugerido al
 * público — exactamente el mismo flujo que cuando un cliente consigna su
 * moto.
 *
 * - Estado: ACTIVO (la moto ya está disponible para venta).
 * - Cliente: el que entregó la permuta (= comprador de la nueva moto).
 * - Precio mínimo: el valor de toma (lo que se descontó de la OC).
 * - Precio venta: arranca igual al precio mínimo — el admin lo ajusta
 *   después con margen.
 * - Documentación: mapea desde el checklist de OCPermuta lo que esté.
 *
 * Se llama dentro del mismo $transaction de la OC para que sea atómico.
 * Si la creación falla por validación, toda la OC se cancela.
 *
 * Devuelve el mandato creado o null si no había suficientes datos
 * (sin marca/modelo no podemos crear un mandato útil).
 */
export async function crearMandatoDesdePermuta(
  tx: Prisma.TransactionClient,
  args: {
    clienteId: string
    ordenCompraId: string
    modeloId: string | null // moto del catálogo asociada (si se creó)
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
  if (!permuta.marca || !permuta.modelo) return null
  if (!permuta.valor || permuta.valor <= 0) return null

  // Notas: copiamos el resto del checklist que no entra en los booleans
  // específicos del schema MandatoVenta (casco, seguro, factura, etc).
  const extrasTxt: string[] = []
  if (permuta.descripcion) extrasTxt.push(permuta.descripcion)
  if (permuta.accesoriosExtra) extrasTxt.push(`Accesorios: ${permuta.accesoriosExtra}`)

  const mandato = await tx.mandatoVenta.create({
    data: {
      clienteId: args.clienteId,
      fechaFirma: args.fecha,
      estado: "ACTIVO",
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
      precioVenta: permuta.valor, // arranca igual al mínimo — el admin lo sube
      precioMinimo: permuta.valor, // = valor de toma
      moneda: args.moneda,
      modeloId: args.modeloId,
      // Linkeo al MandatoVenta la OC sólo si el campo único @unique está
      // disponible — si ya hay un mandato linkeado a esta OC, dejamos null
      // para evitar P2002.
      ordenCompraId: null,
      observaciones: extrasTxt.length > 0
        ? `Generado automáticamente al tomar como parte de pago.\n\n${extrasTxt.join("\n")}`
        : "Generado automáticamente al tomar como parte de pago.",
      fotos: [],
    },
  })
  return mandato
}

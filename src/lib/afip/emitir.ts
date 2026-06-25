import { prisma } from "@/lib/prisma"
import { ARCA_PTO_VENTA } from "./config"
import { CBTE, COND_IVA_RECEPTOR, CONCEPTO, IVA_PCT } from "./tipos"
import { ultimoAutorizado, solicitarCAE, type AlicuotaIva } from "./wsfe"

/**
 * Capa de alto nivel: convierte datos de negocio (cliente + ítems con precio
 * final) en una solicitud de CAE, la emite contra ARCA y la persiste.
 *
 * Convención de precios: `precioUnit` es el precio FINAL con IVA incluido
 * (así lo piensa el negocio: "la moto sale $X"). El neto y el IVA se calculan
 * hacia atrás según la alícuota de cada ítem.
 */

export interface ItemFacturaInput {
  descripcion: string
  cantidad: number
  precioUnit: number // final con IVA incluido
  alicuotaIva: number // id AFIP (5=21%, 4=10.5%, 3=0%)
}

export interface EmitirFacturaInput {
  tipoCbte?: number // si no se pasa, se decide por la condición IVA del receptor
  concepto?: number // default productos
  clienteId?: string
  docTipo: number
  docNro: string
  receptorNombre: string
  receptorDomicilio?: string
  condIvaReceptorId: number
  items: ItemFacturaInput[]
  fecha?: Date
  notas?: string
  ventaId?: string
  mandatoId?: string
}

/** Para un emisor Responsable Inscripto: a otro RI → Factura A; resto → B. */
export function decidirTipoFactura(condIvaReceptorId: number): number {
  return condIvaReceptorId === COND_IVA_RECEPTOR.RESPONSABLE_INSCRIPTO
    ? CBTE.FACTURA_A
    : CBTE.FACTURA_B
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** Descompone los ítems en neto + IVA y agrupa por alícuota. */
function calcularImportes(items: ItemFacturaInput[]) {
  const porAlic = new Map<number, { baseImp: number; importe: number }>()

  for (const it of items) {
    const bruto = it.cantidad * it.precioUnit
    const pct = IVA_PCT[it.alicuotaIva] ?? 0
    const neto = pct > 0 ? bruto / (1 + pct / 100) : bruto
    const iva = bruto - neto
    const acc = porAlic.get(it.alicuotaIva) || { baseImp: 0, importe: 0 }
    acc.baseImp += neto
    acc.importe += iva
    porAlic.set(it.alicuotaIva, acc)
  }

  const alicuotas: AlicuotaIva[] = [...porAlic.entries()].map(([id, v]) => ({
    id,
    baseImp: r2(v.baseImp),
    importe: r2(v.importe),
  }))

  const impNeto = r2(alicuotas.reduce((s, a) => s + a.baseImp, 0))
  const impIva = r2(alicuotas.reduce((s, a) => s + a.importe, 0))
  const impTotal = r2(impNeto + impIva)

  return { alicuotas, impNeto, impIva, impTotal }
}

export interface EmitirResultado {
  ok: boolean
  facturaId: string
  estado: string
  cae: string | null
  numero: number | null
  errores: { code: string; msg: string }[]
  observaciones: { code: string; msg: string }[]
}

export async function emitirFactura(
  input: EmitirFacturaInput
): Promise<EmitirResultado> {
  if (!input.items.length) throw new Error("La factura no tiene ítems.")

  const tipoCbte = input.tipoCbte ?? decidirTipoFactura(input.condIvaReceptorId)
  const concepto = input.concepto ?? CONCEPTO.PRODUCTOS
  const fecha = input.fecha ?? new Date()
  const ptoVta = ARCA_PTO_VENTA

  const { alicuotas, impNeto, impIva, impTotal } = calcularImportes(input.items)

  // Siguiente número correlativo según ARCA (fuente de verdad).
  const ultimo = await ultimoAutorizado(ptoVta, tipoCbte)
  const numero = ultimo + 1

  const res = await solicitarCAE({
    ptoVta,
    cbteTipo: tipoCbte,
    concepto,
    docTipo: input.docTipo,
    docNro: input.docNro,
    cbteNro: numero,
    fecha,
    impTotal,
    impTotConc: 0,
    impNeto,
    impOpEx: 0,
    impTrib: 0,
    impIva,
    condIvaReceptorId: input.condIvaReceptorId,
    alicuotas,
  })

  const aprobada = res.resultado === "A" && !!res.cae

  const factura = await prisma.factura.create({
    data: {
      puntoVenta: ptoVta,
      tipoCbte,
      numero: aprobada ? numero : null,
      concepto,
      fechaCbte: fecha,
      clienteId: input.clienteId || null,
      docTipo: input.docTipo,
      docNro: input.docNro,
      receptorNombre: input.receptorNombre,
      receptorDomicilio: input.receptorDomicilio || null,
      condIvaReceptorId: input.condIvaReceptorId,
      impNeto,
      impIva,
      impTotal,
      items: input.items as unknown as object,
      alicuotas: alicuotas as unknown as object,
      estado: aprobada ? "EMITIDA" : "RECHAZADA",
      cae: res.cae,
      caeVto: res.caeVto,
      arcaResultado: res.resultado,
      arcaObs:
        res.errores.length || res.observaciones.length
          ? ({ errores: res.errores, observaciones: res.observaciones } as object)
          : undefined,
      ventaId: input.ventaId || null,
      mandatoId: input.mandatoId || null,
      notas: input.notas || null,
    },
  })

  return {
    ok: aprobada,
    facturaId: factura.id,
    estado: factura.estado,
    cae: res.cae,
    numero: aprobada ? numero : null,
    errores: res.errores,
    observaciones: res.observaciones,
  }
}

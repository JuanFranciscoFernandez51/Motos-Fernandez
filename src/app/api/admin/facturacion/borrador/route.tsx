import { NextResponse } from "next/server"
import { z } from "zod"
import { renderToBuffer } from "@react-pdf/renderer"
import { requireAdmin } from "@/lib/admin-auth"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"
import { getLogoBuffer } from "@/lib/pdf/logo-loader"
import { FacturaPDF } from "@/lib/pdf/factura-pdf"
import { ARCA_CUIT, ARCA_PTO_VENTA } from "@/lib/afip/config"
import { letraCbte, labelCbte, labelCondIva, IVA_PCT, DOC } from "@/lib/afip/tipos"
import { decidirTipoFactura, calcularImportes } from "@/lib/afip/emitir"

export const dynamic = "force-dynamic"

const itemSchema = z.object({
  descripcion: z.string().min(1, "Descripción vacía"),
  cantidad: z.number().positive(),
  precioUnit: z.number().nonnegative(),
  alicuotaIva: z.number().int(),
})
const bodySchema = z.object({
  tipoCbte: z.number().int().optional(),
  docTipo: z.number().int(),
  docNro: z.string().min(1),
  receptorNombre: z.string().min(1, "Falta el nombre del receptor"),
  receptorDomicilio: z.string().optional().nullable(),
  condIvaReceptorId: z.number().int(),
  items: z.array(itemSchema).min(1, "Agregá al menos un ítem"),
  fecha: z.string().optional(),
})

/**
 * POST /api/admin/facturacion/borrador
 * Genera el PDF de la factura en modo BORRADOR (marca de agua, sin CAE ni QR)
 * para previsualizar antes de emitir. NO le pega a ARCA ni guarda nada.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    )
  }
  const b = parsed.data

  const tipoCbte = b.tipoCbte ?? decidirTipoFactura(b.condIvaReceptorId)
  const letra = letraCbte(tipoCbte)
  const esA = letra === "A"
  const { alicuotas, impNeto, impIva, impTotal } = calcularImportes(b.items)

  const negocio = await getNegocioConfig()
  const cuitEmisor = negocio.cuit && negocio.cuit !== "—" ? negocio.cuit : ARCA_CUIT
  const docLabel = b.docTipo === DOC.CUIT ? "CUIT" : b.docTipo === DOC.CUIL ? "CUIL" : "DNI"

  const ivaDetalle = alicuotas.map((a) => ({
    label: `${IVA_PCT[a.id] ?? 0}%`.replace(".", ","),
    importe: a.importe,
  }))
  const items = b.items.map((it) => {
    const pct = IVA_PCT[it.alicuotaIva] ?? 0
    const bruto = it.precioUnit
    const neto = pct > 0 ? bruto / (1 + pct / 100) : bruto
    const unit = esA ? neto : bruto
    return {
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precioUnit: unit,
      subtotal: unit * it.cantidad,
      alicuota: `${pct}%`.replace(".", ","),
    }
  })

  const pdf = await renderToBuffer(
    <FacturaPDF
      data={{
        letra,
        codigoCbte: tipoCbte,
        tituloCbte: labelCbte(tipoCbte),
        ptoVta: ARCA_PTO_VENTA,
        numero: 0, // borrador: número real lo asigna ARCA al emitir
        fecha: b.fecha ? new Date(b.fecha) : new Date(),
        logoSrc: getLogoBuffer(),
        emisor: {
          razonSocial: negocio.razonSocial,
          domicilio: `${negocio.direccion} — ${negocio.ciudad}`,
          cuit: cuitEmisor,
          iva: negocio.iva,
          ingresosBrutos: negocio.ingresosBrutos,
          inicioActividades: negocio.inicioActividades,
          telefono: negocio.telefono,
          email: negocio.email,
          web: negocio.web,
        },
        receptor: {
          nombre: b.receptorNombre,
          docLabel,
          docNro: b.docNro,
          domicilio: b.receptorDomicilio ?? null,
          condIva: labelCondIva(b.condIvaReceptorId),
        },
        items,
        impNeto,
        impIva,
        impTotal,
        ivaDetalle,
        borrador: true,
      }}
    />
  )

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Borrador-factura-${letra}.pdf"`,
    },
  })
}

import { renderToBuffer } from "@react-pdf/renderer"
import type { Factura } from "@prisma/client"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"
import { getLogoBuffer } from "@/lib/pdf/logo-loader"
import { FacturaPDF } from "@/lib/pdf/factura-pdf"
import { generarQrAfip } from "@/lib/afip/qr"
import { ARCA_CUIT } from "@/lib/afip/config"
import { letraCbte, labelCbte, labelCondIva, IVA_PCT, DOC } from "@/lib/afip/tipos"
import { sendEmail } from "@/lib/email"
import { BUSINESS } from "@/lib/constants"

/** Nombre de archivo estándar: Factura-B-0003-00000123.pdf */
export function facturaFileName(f: Factura): string {
  const letra = letraCbte(f.tipoCbte)
  return `Factura-${letra}-${String(f.puntoVenta).padStart(4, "0")}-${String(
    f.numero ?? 0
  ).padStart(8, "0")}.pdf`
}

/**
 * Renderiza el PDF legal (con CAE + QR AFIP) de una factura EMITIDA.
 * Lanza si la factura no tiene CAE/número (todavía no emitida).
 */
export async function renderFacturaPdf(f: Factura): Promise<Buffer> {
  if (f.estado !== "EMITIDA" || !f.cae || f.numero == null) {
    throw new Error("La factura no está emitida (sin CAE)")
  }

  const negocio = await getNegocioConfig()
  const letra = letraCbte(f.tipoCbte)
  const esA = letra === "A"

  const itemsRaw =
    (f.items as unknown as {
      descripcion: string
      cantidad: number
      precioUnit: number
      alicuotaIva: number
    }[]) || []

  const alicuotasRaw =
    (f.alicuotas as unknown as { id: number; baseImp: number; importe: number }[]) || []
  const ivaDetalle = alicuotasRaw.map((a) => ({
    label: `${IVA_PCT[a.id] ?? 0}%`.replace(".", ","),
    importe: a.importe,
  }))

  const items = itemsRaw.map((it) => {
    const pct = IVA_PCT[it.alicuotaIva] ?? 0
    const brutoUnit = it.precioUnit
    const netoUnit = pct > 0 ? brutoUnit / (1 + pct / 100) : brutoUnit
    const unit = esA ? netoUnit : brutoUnit
    return {
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precioUnit: unit,
      subtotal: unit * it.cantidad,
      alicuota: `${pct}%`.replace(".", ","),
    }
  })

  const qrDataUrl = await generarQrAfip({
    fecha: f.fechaCbte,
    ptoVta: f.puntoVenta,
    tipoCmp: f.tipoCbte,
    nroCmp: f.numero,
    importe: f.impTotal,
    docTipoRec: f.docTipo,
    docNroRec: f.docNro,
    cae: f.cae,
  })

  const docLabel = f.docTipo === DOC.CUIT ? "CUIT" : f.docTipo === DOC.CUIL ? "CUIL" : "DNI"
  const cuitEmisor = negocio.cuit && negocio.cuit !== "—" ? negocio.cuit : ARCA_CUIT

  return renderToBuffer(
    <FacturaPDF
      data={{
        letra,
        codigoCbte: f.tipoCbte,
        tituloCbte: labelCbte(f.tipoCbte),
        ptoVta: f.puntoVenta,
        numero: f.numero,
        fecha: f.fechaCbte,
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
          nombre: f.receptorNombre,
          docLabel,
          docNro: f.docNro,
          domicilio: f.receptorDomicilio,
          condIva: f.condIvaReceptorId ? labelCondIva(f.condIvaReceptorId) : "",
        },
        items,
        impNeto: f.impNeto,
        impIva: f.impIva,
        impTotal: f.impTotal,
        ivaDetalle,
        cae: f.cae,
        caeVto: f.caeVto,
        qrDataUrl,
      }}
    />
  )
}

const money = (n: number) =>
  "$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Envía la factura por email con el PDF adjunto. Devuelve el resultado de
 * `sendEmail` (incluye `skipped: true` si RESEND_API_KEY no está configurado).
 */
export async function sendFacturaPorEmail(f: Factura, to: string) {
  const pdf = await renderFacturaPdf(f)
  const filename = facturaFileName(f)
  const letra = letraCbte(f.tipoCbte)
  const nroFmt = `${String(f.puntoVenta).padStart(4, "0")}-${String(f.numero ?? 0).padStart(8, "0")}`

  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
      <div style="background: #7C3AED; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${BUSINESS.name}</h1>
        <p style="color: #e9d8f4; margin: 4px 0 0; font-size: 13px;">Factura ${letra} ${nroFmt}</p>
      </div>
      <div style="padding: 24px; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 12px;">Hola ${f.receptorNombre},</p>
        <p style="margin: 0 0 12px;">
          Adjuntamos tu <strong>Factura ${letra} N° ${nroFmt}</strong> por un total de
          <strong>${money(f.impTotal)}</strong>. El comprobante está autorizado por ARCA (CAE ${f.cae}).
        </p>
        <p style="margin: 0 0 12px;">El PDF con el detalle y el QR de validación va adjunto a este correo.</p>
        <p style="margin: 16px 0 0; color: #666; font-size: 12px;">
          Cualquier consulta, no dudes en escribirnos.
        </p>
      </div>
      <div style="background: #f5f5f5; color: #666; padding: 14px; text-align: center; font-size: 11px;">
        ${BUSINESS.name} &middot; ${BUSINESS.address}
      </div>
    </div>
  `

  return sendEmail({
    to,
    subject: `Factura ${letra} ${nroFmt} - ${BUSINESS.name}`,
    html,
    attachments: [{ filename, content: pdf }],
  })
}

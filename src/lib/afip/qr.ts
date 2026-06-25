import QRCode from "qrcode"
import { AFIP_QR_BASE, ARCA_CUIT } from "./config"

/**
 * Genera el QR obligatorio de la factura electrónica (RG 4291).
 * El QR codifica una URL del visor de AFIP con un JSON en base64.
 * Devuelve un data URL (PNG) listo para incrustar en el PDF.
 */
export interface DatosQr {
  fecha: Date
  ptoVta: number
  tipoCmp: number
  nroCmp: number
  importe: number
  docTipoRec: number
  docNroRec: string
  cae: string
}

export async function generarQrAfip(d: DatosQr): Promise<string> {
  const payload = {
    ver: 1,
    fecha: new Date(d.fecha.getTime() - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    cuit: Number(ARCA_CUIT),
    ptoVta: d.ptoVta,
    tipoCmp: d.tipoCmp,
    nroCmp: d.nroCmp,
    importe: Math.round(d.importe * 100) / 100,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: d.docTipoRec,
    nroDocRec: Number(d.docNroRec.replace(/\D/g, "")) || 0,
    tipoCodAut: "E",
    codAut: Number(d.cae),
  }
  const url =
    AFIP_QR_BASE + "?p=" + Buffer.from(JSON.stringify(payload)).toString("base64")
  return QRCode.toDataURL(url, { margin: 1, width: 240 })
}

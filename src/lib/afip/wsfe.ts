import { soapCall, pickTag, xmlEscape } from "./soap"
import { getTicketAcceso } from "./wsaa"
import { ARCA_CUIT, WSFE_URL } from "./config"

/**
 * WSFEv1 — Facturación Electrónica de ARCA.
 * Solo lo que necesitamos: dummy (health), último autorizado y solicitud de CAE.
 */

const NS = "http://ar.gov.afip.dif.FEV1/"

/** Arma el sobre SOAP de un método con el bloque <Auth> ya resuelto. */
async function wsfeCall(method: string, innerXml: string): Promise<string> {
  const { token, sign } = await getTicketAcceso("wsfe")
  const auth = `<ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${ARCA_CUIT}</ar:Cuit></ar:Auth>`
  const body = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}"><soap:Body><ar:${method}>${auth}${innerXml}</ar:${method}></soap:Body></soap:Envelope>`
  const resp = await soapCall(WSFE_URL, NS + method, body)
  const fault = pickTag(resp, "faultstring")
  if (fault) throw new Error(`WSFE/${method}: ${fault}`)
  return resp
}

/** Lee los <Err>…<Code>/<Msg> que ARCA devuelve en el nodo <Errors>. */
function leerErrores(xml: string): { code: string; msg: string }[] {
  const errs: { code: string; msg: string }[] = []
  const bloque = xml.match(/<Errors>([\s\S]*?)<\/Errors>/)
  if (!bloque) return errs
  for (const m of bloque[1].matchAll(/<Err>([\s\S]*?)<\/Err>/g)) {
    errs.push({
      code: pickTag(m[1], "Code") || "",
      msg: pickTag(m[1], "Msg") || "",
    })
  }
  return errs
}

function leerObservaciones(xml: string): { code: string; msg: string }[] {
  const obs: { code: string; msg: string }[] = []
  for (const m of xml.matchAll(/<Obs>([\s\S]*?)<\/Obs>/g)) {
    obs.push({
      code: pickTag(m[1], "Code") || "",
      msg: pickTag(m[1], "Msg") || "",
    })
  }
  return obs
}

/** Health-check del servicio (AppServer/DbServer/AuthServer). */
export async function feDummy(): Promise<{
  appServer: string
  dbServer: string
  authServer: string
}> {
  const resp = await wsfeCall("FEDummy", "")
  return {
    appServer: pickTag(resp, "AppServer") || "?",
    dbServer: pickTag(resp, "DbServer") || "?",
    authServer: pickTag(resp, "AuthServer") || "?",
  }
}

/** Último número de comprobante autorizado para un (PtoVta, CbteTipo). */
export async function ultimoAutorizado(
  ptoVta: number,
  cbteTipo: number
): Promise<number> {
  const resp = await wsfeCall(
    "FECompUltimoAutorizado",
    `<ar:PtoVta>${ptoVta}</ar:PtoVta><ar:CbteTipo>${cbteTipo}</ar:CbteTipo>`
  )
  const errs = leerErrores(resp)
  if (errs.length) {
    throw new Error(
      `FECompUltimoAutorizado: ${errs.map((e) => `${e.code} ${e.msg}`).join(" | ")}`
    )
  }
  const nro = pickTag(resp, "CbteNro")
  return nro ? parseInt(nro, 10) : 0
}

// ---- Solicitud de CAE ----

export interface AlicuotaIva {
  id: number // id AFIP (5=21%, 4=10.5%, 3=0%)
  baseImp: number
  importe: number
}

export interface SolicitudCAE {
  ptoVta: number
  cbteTipo: number
  concepto: number // 1=productos, 2=servicios, 3=ambos
  docTipo: number
  docNro: string
  cbteNro: number // número a emitir (último + 1)
  fecha: Date
  impTotal: number
  impTotConc: number
  impNeto: number
  impOpEx: number
  impTrib: number
  impIva: number
  moneda?: string // "PES"
  cotizacion?: number // 1
  condIvaReceptorId: number // RG 5616
  alicuotas: AlicuotaIva[]
  // Para concepto 2/3 (servicios)
  fchServDesde?: Date
  fchServHasta?: Date
  fchVtoPago?: Date
}

export interface ResultadoCAE {
  resultado: string // "A" aprobado | "R" rechazado | "P" parcial
  cae: string | null
  caeVto: Date | null
  cbteNro: number
  observaciones: { code: string; msg: string }[]
  errores: { code: string; msg: string }[]
}

function fechaAfip(d: Date): string {
  // yyyymmdd en hora local Argentina (el server corre en UTC; sumamos -3h
  // recortando solo la fecha basta porque ARCA compara contra el día).
  const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return ar.toISOString().slice(0, 10).replace(/-/g, "")
}

function n2(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2)
}

/** Solicita el CAE de un comprobante. Devuelve resultado + CAE o errores. */
export async function solicitarCAE(s: SolicitudCAE): Promise<ResultadoCAE> {
  const moneda = s.moneda || "PES"
  const cotiz = s.cotizacion ?? 1

  const ivaXml =
    s.alicuotas.length > 0
      ? `<ar:Iva>${s.alicuotas
          .map(
            (a) =>
              `<ar:AlicIva><ar:Id>${a.id}</ar:Id><ar:BaseImp>${n2(
                a.baseImp
              )}</ar:BaseImp><ar:Importe>${n2(a.importe)}</ar:Importe></ar:AlicIva>`
          )
          .join("")}</ar:Iva>`
      : ""

  // Para servicios (concepto 2 o 3) ARCA exige fechas de servicio + vto de pago.
  const fechasServ =
    s.concepto !== 1
      ? `<ar:FchServDesde>${fechaAfip(s.fchServDesde || s.fecha)}</ar:FchServDesde><ar:FchServHasta>${fechaAfip(
          s.fchServHasta || s.fecha
        )}</ar:FchServHasta><ar:FchVtoPago>${fechaAfip(s.fchVtoPago || s.fecha)}</ar:FchVtoPago>`
      : ""

  const det = `<ar:FECAEDetRequest>
    <ar:Concepto>${s.concepto}</ar:Concepto>
    <ar:DocTipo>${s.docTipo}</ar:DocTipo>
    <ar:DocNro>${xmlEscape(s.docNro)}</ar:DocNro>
    <ar:CbteDesde>${s.cbteNro}</ar:CbteDesde>
    <ar:CbteHasta>${s.cbteNro}</ar:CbteHasta>
    <ar:CbteFch>${fechaAfip(s.fecha)}</ar:CbteFch>
    <ar:ImpTotal>${n2(s.impTotal)}</ar:ImpTotal>
    <ar:ImpTotConc>${n2(s.impTotConc)}</ar:ImpTotConc>
    <ar:ImpNeto>${n2(s.impNeto)}</ar:ImpNeto>
    <ar:ImpOpEx>${n2(s.impOpEx)}</ar:ImpOpEx>
    <ar:ImpTrib>${n2(s.impTrib)}</ar:ImpTrib>
    <ar:ImpIVA>${n2(s.impIva)}</ar:ImpIVA>
    ${fechasServ}
    <ar:MonId>${moneda}</ar:MonId>
    <ar:MonCotiz>${n2(cotiz)}</ar:MonCotiz>
    <ar:CondicionIVAReceptorId>${s.condIvaReceptorId}</ar:CondicionIVAReceptorId>
    ${ivaXml}
  </ar:FECAEDetRequest>`

  const inner = `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${s.ptoVta}</ar:PtoVta><ar:CbteTipo>${s.cbteTipo}</ar:CbteTipo></ar:FeCabReq><ar:FeDetReq>${det}</ar:FeDetReq></ar:FeCAEReq>`

  const resp = await wsfeCall("FECAESolicitar", inner)

  const errores = leerErrores(resp)
  const observaciones = leerObservaciones(resp)
  const resultado = pickTag(resp, "Resultado") || (errores.length ? "R" : "?")
  const caeRaw = pickTag(resp, "CAE")
  const caeVtoRaw = pickTag(resp, "CAEFchVto")
  const cae = caeRaw && caeRaw.trim() ? caeRaw.trim() : null

  return {
    resultado,
    cae,
    caeVto:
      caeVtoRaw && caeVtoRaw.length === 8
        ? new Date(
            `${caeVtoRaw.slice(0, 4)}-${caeVtoRaw.slice(4, 6)}-${caeVtoRaw.slice(6, 8)}T12:00:00-03:00`
          )
        : null,
    cbteNro: s.cbteNro,
    observaciones,
    errores,
  }
}

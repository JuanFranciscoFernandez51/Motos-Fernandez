import { soapCall, pickTag, xmlUnescape } from "./soap"
import { getTicketAcceso } from "./wsaa"
import { ARCA_CUIT, WS_PADRON_A13_URL } from "./config"
import { COND_IVA_RECEPTOR, DOC } from "./tipos"

/**
 * Padrón A13 — consulta de datos de una persona por CUIT.
 * Devuelve nombre y domicilio para autocompletar el receptor de la factura.
 * (La condición frente al IVA no viene en A13, así que se sugiere por defecto y
 * el usuario la confirma en la UI.)
 */

export interface DatosPadron {
  cuit: string
  nombre: string
  domicilio: string | null
  localidad: string | null
  provincia: string | null
  codigoPostal: string | null
  tipoPersona: string | null // FISICA | JURIDICA
  condIvaSugerida: number
  docTipoSugerido: number
}

export async function consultarPadron(cuitRaw: string): Promise<DatosPadron> {
  const cuit = cuitRaw.replace(/\D/g, "")
  if (cuit.length !== 11) {
    throw new Error("El CUIT/CUIL debe tener 11 dígitos.")
  }

  const { token, sign } = await getTicketAcceso("ws_sr_padron_a13")
  const body = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a13="http://a13.soap.ws.server.puc.sr/"><soapenv:Header/><soapenv:Body><a13:getPersona><token>${token}</token><sign>${sign}</sign><cuitRepresentada>${ARCA_CUIT}</cuitRepresentada><idPersona>${cuit}</idPersona></a13:getPersona></soapenv:Body></soapenv:Envelope>`

  const resp = await soapCall(WS_PADRON_A13_URL, "", body)
  const fault = pickTag(resp, "faultstring")
  if (fault) {
    const f = xmlUnescape(fault)
    // ARCA devuelve "No existe persona..." si el CUIT no está en padrón
    throw new Error(`Padrón: ${f}`)
  }

  const razon = pickTag(resp, "razonSocial")
  const apellido = pickTag(resp, "apellido")
  const nombre = pickTag(resp, "nombre")
  const tipoPersona = pickTag(resp, "tipoPersona")

  const nombreCompleto =
    razon?.trim() ||
    [apellido?.trim(), nombre?.trim()].filter(Boolean).join(" ") ||
    ""

  // Domicilio: preferimos el FISCAL; si no, el primero que aparezca.
  const domicilios = [...resp.matchAll(/<domicilio>([\s\S]*?)<\/domicilio>/g)].map(
    (m) => m[1]
  )
  const fiscal =
    domicilios.find((d) => /FISCAL/i.test(pickTag(d, "tipoDomicilio") || "")) ||
    domicilios[0] ||
    ""

  const calle = pickTag(fiscal, "calle")
  const numero = pickTag(fiscal, "numero")
  const localidad = pickTag(fiscal, "localidad")
  const provincia = pickTag(fiscal, "descripcionProvincia")
  const cp = pickTag(fiscal, "codigoPostal")
  const direccion =
    pickTag(fiscal, "direccion") ||
    [calle, numero].filter(Boolean).join(" ").trim() ||
    null

  return {
    cuit,
    nombre: nombreCompleto,
    domicilio: direccion,
    localidad: localidad?.trim() || null,
    provincia: provincia?.trim() || null,
    codigoPostal: cp?.trim() || null,
    tipoPersona: tipoPersona?.trim() || null,
    // No tenemos la condición IVA en A13: default seguro = Consumidor Final.
    condIvaSugerida: COND_IVA_RECEPTOR.CONSUMIDOR_FINAL,
    docTipoSugerido: DOC.CUIT,
  }
}

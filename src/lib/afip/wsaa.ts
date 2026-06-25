import forge from "node-forge"
import { prisma } from "@/lib/prisma"
import { soapCall, xmlUnescape, pickTag } from "./soap"
import { getCertPem, getKeyPem, WSAA_URL } from "./config"

/**
 * WSAA — Autenticación de ARCA.
 *
 * Flujo: se arma un "Ticket de Requerimiento de Acceso" (TRA), se firma con el
 * certificado (CMS/PKCS#7) y se envía a LoginCms, que devuelve un Ticket de
 * Acceso (token + sign) válido ~12h. Ese ticket se cachea en la DB porque ARCA
 * rechaza pedir uno nuevo mientras el anterior sigue vigente.
 */

export interface TicketAcceso {
  token: string
  sign: string
}

function buildTRA(service: string): string {
  const now = Date.now()
  const gen = new Date(now - 10 * 60 * 1000).toISOString()
  const exp = new Date(now + 10 * 60 * 1000).toISOString()
  const uid = Math.floor(now / 1000)
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0"><header><uniqueId>${uid}</uniqueId><generationTime>${gen}</generationTime><expirationTime>${exp}</expirationTime></header><service>${service}</service></loginTicketRequest>`
}

/** Firma el TRA con CMS (PKCS#7 SignedData) y devuelve el DER en base64. */
function signTRA(tra: string): string {
  const cert = forge.pki.certificateFromPem(getCertPem())
  const key = forge.pki.privateKeyFromPem(getKeyPem())

  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(tra, "utf8")
  p7.addCertificate(cert)
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date().toString() },
    ],
  })
  p7.sign({ detached: false })

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
  return forge.util.encode64(der)
}

/** Llama a LoginCms y devuelve { token, sign, expira }. */
async function loginCms(service: string): Promise<TicketAcceso & { expira: Date }> {
  const cms = signTRA(buildTRA(service))
  const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`

  const resp = await soapCall(WSAA_URL, "", soap)

  // ¿Falla SOAP? (ej: "El CEE ya posee un TA valido")
  const fault = pickTag(resp, "faultstring")
  if (fault) {
    throw new Error(`WSAA: ${xmlUnescape(fault)}`)
  }

  const ticketXml = xmlUnescape(resp)
  const token = pickTag(ticketXml, "token")
  const sign = pickTag(ticketXml, "sign")
  const expira = pickTag(ticketXml, "expirationTime")
  if (!token || !sign) {
    throw new Error("WSAA no devolvió token/sign. Respuesta: " + resp.slice(0, 300))
  }
  return {
    token,
    sign,
    expira: expira ? new Date(expira) : new Date(Date.now() + 11 * 60 * 60 * 1000),
  }
}

/**
 * Devuelve un Ticket de Acceso válido para el servicio pedido.
 * Reusa el cacheado mientras le queden > 5 min de vida; si no, re-autentica.
 */
export async function getTicketAcceso(service = "wsfe"): Promise<TicketAcceso> {
  const cached = await prisma.arcaTicket.findUnique({ where: { service } })
  if (cached && cached.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return { token: cached.token, sign: cached.sign }
  }

  const fresh = await loginCms(service)
  await prisma.arcaTicket.upsert({
    where: { service },
    create: {
      service,
      token: fresh.token,
      sign: fresh.sign,
      expiresAt: fresh.expira,
    },
    update: {
      token: fresh.token,
      sign: fresh.sign,
      expiresAt: fresh.expira,
    },
  })
  return { token: fresh.token, sign: fresh.sign }
}

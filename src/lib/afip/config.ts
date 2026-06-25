/**
 * Configuración de la integración con ARCA (ex AFIP).
 *
 * El certificado y la clave privada viven como variables de entorno en Vercel
 * (NUNCA en el repo ni en la DB). Pueden estar en PEM crudo o en base64 del PEM
 * — se acepta cualquiera de las dos formas.
 *
 *   ARCA_CERT        cert .crt (PEM o base64 del PEM)
 *   ARCA_KEY         clave privada .key (PEM o base64 del PEM)
 *   ARCA_CUIT        CUIT del emisor (default 20448815359)
 *   ARCA_PTO_VENTA   punto de venta "RECE web services" (default 3)
 *   ARCA_ENV         "prod" (default) | "homo" (homologación/testing)
 */

function pemFromEnv(name: string): string {
  const raw = process.env[name]
  if (!raw) {
    throw new Error(
      `${name} no está definida. Cargá el certificado/clave de ARCA en las variables de entorno.`
    )
  }
  // Si ya viene como PEM, se usa tal cual; si no, se asume base64 del PEM.
  if (raw.includes("BEGIN")) return raw.replace(/\\n/g, "\n")
  return Buffer.from(raw, "base64").toString("utf8")
}

export const getCertPem = () => pemFromEnv("ARCA_CERT")
export const getKeyPem = () => pemFromEnv("ARCA_KEY")

export const ARCA_CUIT = process.env.ARCA_CUIT || "20448815359"
export const ARCA_PTO_VENTA = parseInt(process.env.ARCA_PTO_VENTA || "3", 10)

const IS_PROD = (process.env.ARCA_ENV || "prod").toLowerCase() !== "homo"

export const WSAA_URL = IS_PROD
  ? "https://wsaa.afip.gov.ar/ws/services/LoginCms"
  : "https://wsaahomo.afip.gov.ar/ws/services/LoginCms"

export const WSFE_URL = IS_PROD
  ? "https://servicios1.afip.gov.ar/wsfev1/service.asmx"
  : "https://wswhomo.afip.gov.ar/wsfev1/service.asmx"

// Padrón A13 (consulta de inscripción / condición frente al IVA)
export const WS_PADRON_A13_URL = IS_PROD
  ? "https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13"
  : "https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA13"

// URL base del visor de comprobantes (para el QR de RG 4291)
export const AFIP_QR_BASE = "https://www.afip.gob.ar/fe/qr/"

export const ARCA_IS_PROD = IS_PROD

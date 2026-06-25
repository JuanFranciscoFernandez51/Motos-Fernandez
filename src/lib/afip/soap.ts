import https from "node:https"

/**
 * POST SOAP usando el cliente `https` nativo de Node.
 *
 * Importante: NO usamos `fetch` (undici) porque falla de forma intermitente
 * contra los hosts de AFIP (`servicios1.afip.gov.ar`) — `https` nativo y `curl`
 * conectan sin problema. Reintenta ante errores de red transitorios.
 */
export async function soapCall(
  url: string,
  soapAction: string,
  xml: string,
  { timeoutMs = 30000, retries = 3 }: { timeoutMs?: number; retries?: number } = {}
): Promise<string> {
  let lastErr: unknown
  for (let intento = 0; intento < retries; intento++) {
    try {
      return await postOnce(url, soapAction, xml, timeoutMs)
    } catch (e) {
      lastErr = e
      // backoff simple antes de reintentar
      await new Promise((r) => setTimeout(r, 1500 * (intento + 1)))
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Error de red llamando a ARCA")
}

function postOnce(
  url: string,
  soapAction: string,
  xml: string,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const data = Buffer.from(xml, "utf8")
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: soapAction,
          "Content-Length": data.length,
        },
        timeout: timeoutMs,
        // Los servidores de ARCA negocian una clave Diffie-Hellman vieja (1024b)
        // que el OpenSSL moderno de Node rechaza en el nivel 2 por defecto
        // ("dh key too small"). Bajamos al nivel 1 (mínimo que las acepta).
        ciphers: "DEFAULT@SECLEVEL=1",
        minVersion: "TLSv1.2" as const,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (c) => chunks.push(c))
        res.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8"))
        )
      }
    )
    req.on("error", reject)
    req.on("timeout", () => req.destroy(new Error(`Timeout SOAP ${u.hostname}`)))
    req.write(data)
    req.end()
  })
}

/** Extrae el contenido del primer elemento <tag>…</tag> (sin namespaces). */
export function pickTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`))
  return m ? m[1] : null
}

/** Des-escapa entidades XML básicas. */
export function xmlUnescape(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

/** Escapa texto para meterlo en un nodo XML. */
export function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

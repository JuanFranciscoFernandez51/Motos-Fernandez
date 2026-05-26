import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto"

/**
 * Encriptación de tokens sensibles (access tokens de Meta, etc.) para
 * almacenamiento en DB. AES-256-GCM provee confidencialidad + integridad
 * (authTag detecta manipulación o uso con clave incorrecta).
 *
 * Formato del ciphertext: `enc:v1:<base64(iv|tag|ciphertext)>`
 *
 * Prefijo `enc:v1:` para:
 * 1. Detectar si un valor de DB ya está encriptado o todavía no (backfill).
 * 2. Versionar el esquema si en el futuro rotamos algo (cambia a v2 sin
 *    romper datos viejos — el decrypt puede manejar varios formatos).
 *
 * La clave maestra vive en `META_TOKEN_ENCRYPTION_KEY` como base64 de 32
 * bytes. Si la clave cambia o se pierde, los tokens almacenados se vuelven
 * ilegibles y hay que reconectar Meta desde cero.
 */

const ENC_PREFIX = "enc:v1:"
const IV_LENGTH = 12 // GCM recomienda 12 bytes
const TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "META_TOKEN_ENCRYPTION_KEY no está definida. Generala con `openssl rand -base64 32`."
    )
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error(
      `META_TOKEN_ENCRYPTION_KEY tiene ${key.length} bytes, esperaba 32 (base64 de 32 bytes). Regenerala con openssl rand -base64 32`
    )
  }
  return key
}

/**
 * Encripta un string plano. Devuelve un blob con prefijo `enc:v1:`. Si
 * el valor ya viene encriptado (prefijo presente), lo devuelve tal cual
 * — idempotente, evita doble-encrypt si se llama dos veces.
 */
export function encryptToken(plain: string): string {
  if (!plain) return plain
  if (plain.startsWith(ENC_PREFIX)) return plain

  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", key, iv) as CipherGCM
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  const blob = Buffer.concat([iv, tag, ciphertext]).toString("base64")
  return `${ENC_PREFIX}${blob}`
}

/**
 * Desencripta un valor con prefijo `enc:v1:`. Si el valor NO tiene
 * prefijo, se asume que está en texto plano (compat con datos pre-
 * migración) y se devuelve tal cual.
 *
 * Esto permite migración incremental: el sistema sigue funcionando con
 * tokens viejos en plano mientras los nuevos se guardan encriptados.
 * Después corremos el script de backfill que encripta los restantes.
 */
export function decryptToken(stored: string | null | undefined): string {
  if (!stored) return ""
  if (!stored.startsWith(ENC_PREFIX)) return stored // legacy plano

  const key = getKey()
  const blob = Buffer.from(stored.slice(ENC_PREFIX.length), "base64")
  if (blob.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Token encriptado corrupto: longitud inválida")
  }
  const iv = blob.subarray(0, IV_LENGTH)
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = blob.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv("aes-256-gcm", key, iv) as DecipherGCM
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plain.toString("utf8")
}

/** Útil para detectar tokens pendientes de backfill en scripts/migración. */
export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(ENC_PREFIX)
}

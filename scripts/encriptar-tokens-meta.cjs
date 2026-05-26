#!/usr/bin/env node
/**
 * Backfill: encripta el `pageAccessToken` actual de MetaConfig en DB que
 * fue guardado en texto plano (pre-migración a AES-256-GCM).
 *
 * Idempotente: si el token ya tiene el prefijo `enc:v1:`, no hace nada.
 *
 * Uso:
 *   node scripts/encriptar-tokens-meta.cjs
 *
 * Requiere `META_TOKEN_ENCRYPTION_KEY` definida en el entorno.
 * Carga `.env.local` automáticamente si está presente.
 */

require("dotenv").config({ path: ".env.local" })

const { createCipheriv, randomBytes } = require("node:crypto")
const { PrismaClient } = require("@prisma/client")

const ENC_PREFIX = "enc:v1:"
const IV_LENGTH = 12

function encryptToken(plain) {
  if (!plain) return plain
  if (plain.startsWith(ENC_PREFIX)) return plain
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("Falta META_TOKEN_ENCRYPTION_KEY en el entorno.")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error(
      `META_TOKEN_ENCRYPTION_KEY tiene ${key.length} bytes, esperaba 32.`
    )
  }
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  const blob = Buffer.concat([iv, tag, ciphertext]).toString("base64")
  return `${ENC_PREFIX}${blob}`
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const cfg = await prisma.metaConfig.findUnique({
      where: { id: "default" },
    })
    if (!cfg) {
      console.log("ℹ️  No hay MetaConfig — nada que encriptar.")
      return
    }
    if (!cfg.pageAccessToken) {
      console.log("ℹ️  MetaConfig.pageAccessToken vacío — nada que encriptar.")
      return
    }
    if (cfg.pageAccessToken.startsWith(ENC_PREFIX)) {
      console.log("✅ Token ya estaba encriptado — nada que hacer.")
      return
    }

    const encrypted = encryptToken(cfg.pageAccessToken)
    await prisma.metaConfig.update({
      where: { id: "default" },
      data: { pageAccessToken: encrypted },
    })
    console.log(
      `✅ Token encriptado y guardado. Prefijo nuevo: ${encrypted.slice(0, 20)}...`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("❌ Error:", err)
  process.exit(1)
})

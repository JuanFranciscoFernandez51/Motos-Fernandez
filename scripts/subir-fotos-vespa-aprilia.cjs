#!/usr/bin/env node
/**
 * Sube las fotos de Aprilia/Vespa/Piaggio (carpeta Fotos-Vespa-Bahia) a
 * Cloudinary y las asocia a sus modelos 0KM.
 *
 * Estructura: MARCA-marca-modelo[-USADA]/foto-XX.{jpg,webp,png}
 * Cada carpeta tiene VARIAS fotos (3-12) → se suben todas, ordenadas.
 *
 * Solo procesa las 0KM (sin sufijo -USADA). Las usadas se manejan aparte
 * (son unidades físicas únicas, requieren decisión manual).
 *
 * Match por tokens: todos los tokens del nombre de carpeta deben estar
 * en el nombre del modelo en DB (maneja diferencias de orden, ej.
 * "tuareg-rally-660" ↔ "Tuareg 660 Rally").
 *
 * Idempotente: si el modelo ya tiene fotos de Cloudinary, lo saltea.
 *
 * Uso: node scripts/subir-fotos-vespa-aprilia.cjs
 */

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")
const { v2: cloudinary } = require("cloudinary")
const { PrismaClient } = require("@prisma/client")

cloudinary.config({
  cloud_name: (
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "dgtlyzyra"
  ).trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
})

const BASE = "/Users/juanfri/Downloads/Fotos-Vespa-Bahia"
const MARCAS = { APRILIA: "Aprilia", VESPA: "Vespa", PIAGGIO: "Piaggio" }
const ESIMG = (f) => /\.(jpe?g|png|webp)$/i.test(f)

const tokens = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

/** true si todos los tokens de `a` están en `b` (o viceversa). */
function tokensMatch(a, b) {
  const ta = tokens(a)
  const tb = tokens(b)
  const aInB = ta.every((t) => tb.includes(t))
  const bInA = tb.every((t) => ta.includes(t))
  return aInB || bInA
}

function modeloDeCarpeta(carpeta, marcaKey) {
  return carpeta
    .replace(new RegExp("^" + marcaKey + "-" + marcaKey.toLowerCase() + "-", "i"), "")
    .replace(/-usada(-\d+)?-USADA$/i, "")
    .replace(/-USADA$/i, "")
    .replace(/-gris$/i, "")
}

async function main() {
  const prisma = new PrismaClient()
  let modelosActualizados = 0
  let fotosSubidas = 0
  let salteadas = 0
  const errores = []

  try {
    const carpetas = fs
      .readdirSync(BASE)
      .filter((d) => {
        try {
          return fs.statSync(path.join(BASE, d)).isDirectory()
        } catch {
          return false
        }
      })
      .filter((d) => !/USADA$/i.test(d)) // solo 0KM acá

    for (const carpeta of carpetas) {
      const marcaKey = carpeta.split("-")[0]
      const marcaDB = MARCAS[marcaKey] || marcaKey
      const modeloSlug = modeloDeCarpeta(carpeta, marcaKey)

      const modelos = await prisma.modelo.findMany({
        where: { marca: { equals: marcaDB, mode: "insensitive" }, condicion: "0KM" },
        select: { id: true, nombre: true, fotos: true },
      })
      const hit = modelos.find((m) => tokensMatch(modeloSlug, m.nombre))
      if (!hit) {
        errores.push(`${carpeta} — sin match en DB`)
        continue
      }
      if (hit.fotos.some((f) => f.includes("cloudinary.com"))) {
        salteadas++
        continue
      }

      // Subir todas las fotos de la carpeta, ordenadas por nombre.
      const dir = path.join(BASE, carpeta)
      const archivos = fs.readdirSync(dir).filter(ESIMG).sort()
      const urls = []
      for (const a of archivos) {
        try {
          const res = await cloudinary.uploader.upload(path.join(dir, a), {
            folder: "motos-fernandez/modelos",
            transformation: [
              { width: 2000, height: 2000, crop: "limit", quality: "auto:good", fetch_format: "jpg" },
            ],
          })
          urls.push(res.secure_url)
          fotosSubidas++
        } catch (e) {
          errores.push(`${carpeta}/${a} — ${e.message}`)
        }
      }
      if (urls.length === 0) {
        errores.push(`${carpeta} — no se subió ninguna foto`)
        continue
      }
      await prisma.modelo.update({
        where: { id: hit.id },
        data: { fotos: urls, activo: true },
      })
      modelosActualizados++
      console.log(`✅ ${marcaDB} ${hit.nombre} — ${urls.length} fotos`)
    }

    console.log(
      `\nModelos actualizados: ${modelosActualizados} · fotos subidas: ${fotosSubidas} · salteados: ${salteadas}`
    )
    if (errores.length) {
      console.log("\nErrores/avisos:")
      errores.forEach((e) => console.log("  ", e))
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})

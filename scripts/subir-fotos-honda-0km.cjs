#!/usr/bin/env node
/**
 * Sube las fotos 0KM nuevas de Honda (carpeta del Desktop de Francisco) a
 * Cloudinary y las asocia a sus modelos en la DB, reemplazando el
 * placeholder (/images/logo-clasico.png).
 *
 * Mapeo explícito archivo → modelo, con orden lógico (la foto principal
 * primero, luego colores y detalles). Idempotente: si el modelo ya tiene
 * una foto de Cloudinary, lo saltea.
 *
 * Uso: node scripts/subir-fotos-honda-0km.cjs
 */

require("dotenv").config({ path: ".env.local", override: true })
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

const BASE = "/Users/juanfri/Desktop/fotos 0km nuevas"

// nombre exacto en DB → lista ordenada de archivos (principal primero)
const MAPA = {
  "PCX 160": [
    "pcx160-blanco.jpeg",
    "pcx160-azul.jpeg",
    "pcx160-negro.jpeg",
    "pcx160-tecnologia-1.jpg",
    "pcx160-tecnologia-2.jpg",
    "pcx160-tecnologia-4.jpg",
    "pcx160-CONF-baul-2.jpg",
  ],
  "CRF1100L Africa Twin": [
    "honda-africa-twin.jpg",
    "africa-twin.jpg",
    "africa-twin-n.jpg",
    "africa-twin-diseno-1.jpg",
    "africa-twin-diseno-2.jpg",
    "africa-twin-diseno-3.jpg",
    "africa-twin-diseno-5.jpg",
    "africa-twin-tablero-electronica.jpg",
  ],
  NC750X: [
    "honda-nc750x-blanca.jpg",
    "honda-nc750x-roja.jpg",
    "honda-nc750x-verde.jpg",
  ],
  "TRX420 (quad)": [
    "Honda-TRX420-roja.jpg",
    "Honda-TRX420-negro.jpg",
    "Honda-TRX420-vinedos.jpg",
  ],
  "TRX250 (quad)": [
    "trx250-color-rojo-1.jpg",
    "trx250-disen.jpg",
    "trx250-tecno.jpg",
    "trx250-motor.jpg",
  ],
}

async function subir(ruta) {
  const res = await cloudinary.uploader.upload(ruta, {
    folder: "motos-fernandez/modelos",
    transformation: [
      {
        width: 2000,
        height: 2000,
        crop: "limit",
        quality: "auto:good",
        fetch_format: "jpg",
      },
    ],
  })
  return res.secure_url
}

async function main() {
  const prisma = new PrismaClient()
  let modelos = 0
  let fotosSubidas = 0
  let salteados = 0
  const errores = []

  try {
    for (const [nombre, archivos] of Object.entries(MAPA)) {
      const m = await prisma.modelo.findFirst({
        where: {
          marca: { equals: "Honda", mode: "insensitive" },
          nombre,
          condicion: "0KM",
        },
        select: { id: true, nombre: true, fotos: true },
      })
      if (!m) {
        errores.push(`${nombre} — sin match en DB`)
        continue
      }
      if (m.fotos.some((f) => f.includes("cloudinary.com"))) {
        salteados++
        console.log(`⏭  ${nombre} — ya tenía fotos`)
        continue
      }

      const urls = []
      for (const archivo of archivos) {
        const ruta = path.join(BASE, archivo)
        if (!fs.existsSync(ruta)) {
          errores.push(`${nombre} — falta archivo ${archivo}`)
          continue
        }
        try {
          urls.push(await subir(ruta))
          fotosSubidas++
        } catch (e) {
          errores.push(`${nombre}/${archivo} — error: ${e.message}`)
        }
      }

      if (urls.length === 0) {
        errores.push(`${nombre} — no se subió ninguna foto`)
        continue
      }

      await prisma.modelo.update({
        where: { id: m.id },
        data: { fotos: urls, activo: true },
      })
      modelos++
      console.log(`✅ ${nombre} — ${urls.length} fotos`)
    }

    console.log(
      `\nModelos actualizados: ${modelos} · Fotos subidas: ${fotosSubidas} · Salteados: ${salteados}`
    )
    if (errores.length) {
      console.log("\nErrores:")
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

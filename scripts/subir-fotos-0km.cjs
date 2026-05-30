#!/usr/bin/env node
/**
 * Sube las fotos del catálogo 0KM (carpeta de Francisco) a Cloudinary y
 * las asocia a sus modelos en la DB.
 *
 * Estructura de la carpeta:
 *   MARCA/Modelo/"Modelo - foto lista.jpeg|png"  ← foto principal
 *               /Color X/(fotos por color, hoy vacías)
 *
 * Por ahora solo Kawasaki y CFMoto tienen fotos reales (la "foto lista").
 * Para cada modelo con foto:
 *   1. Sube la foto a Cloudinary (folder motos-fernandez/modelos).
 *   2. Asocia la URL al modelo (fotos[0]).
 *   3. Activa el modelo (activo=true) — ya tiene foto, puede publicarse.
 *
 * Idempotente: si el modelo ya tiene una foto de Cloudinary (no el
 * placeholder), lo saltea.
 *
 * Uso: node scripts/subir-fotos-0km.cjs
 */

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")
const { v2: cloudinary } = require("cloudinary")
const { PrismaClient } = require("@prisma/client")

cloudinary.config({
  cloud_name:
    (process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      "dgtlyzyra").trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
})

const BASE =
  "/Users/juanfri/Library/Application Support/Claude/local-agent-mode-sessions/a681e2f3-79de-473a-8b7d-e819f2fb52d5/2167e449-4528-4f53-92c0-daf1459d4039/local_6b90add5-9495-4cf4-bfa4-983cf7a3d778/outputs/Catalogo_Motos_Fernandez"

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")

const ESIMG = (f) => /\.(jpe?g|png|webp)$/i.test(f)

async function main() {
  const prisma = new PrismaClient()
  let subidas = 0
  let salteadas = 0
  const errores = []

  try {
    for (const [marcaFolder, marcaDB] of [
      ["KAWASAKI", "Kawasaki"],
      ["CFMOTO", "CFMoto"],
    ]) {
      const modelosDB = await prisma.modelo.findMany({
        where: {
          marca: { equals: marcaDB, mode: "insensitive" },
          condicion: "0KM",
        },
        select: { id: true, nombre: true, fotos: true },
      })
      const dbNorm = modelosDB.map((m) => ({ ...m, n: norm(m.nombre) }))

      const dirMarca = path.join(BASE, marcaFolder)
      const carpetas = fs
        .readdirSync(dirMarca)
        .filter((d) => {
          try {
            return fs.statSync(path.join(dirMarca, d)).isDirectory()
          } catch {
            return false
          }
        })

      for (const carpeta of carpetas) {
        const cn = norm(carpeta)
        const modelo = dbNorm.find(
          (d) => d.n === cn || d.n.includes(cn) || cn.includes(d.n)
        )
        if (!modelo) {
          errores.push(`${marcaFolder}/${carpeta} — sin match en DB`)
          continue
        }
        // Ya tiene foto de Cloudinary?
        const yaTiene = modelo.fotos.some((f) => f.includes("cloudinary.com"))
        if (yaTiene) {
          salteadas++
          continue
        }

        // Buscar la "foto lista" (la principal del modelo)
        const dirModelo = path.join(dirMarca, carpeta)
        const archivos = fs.readdirSync(dirModelo).filter(ESIMG)
        const fotoLista =
          archivos.find((a) => /foto lista/i.test(a)) || archivos[0]
        if (!fotoLista) {
          errores.push(`${marcaFolder}/${carpeta} — sin imagen`)
          continue
        }

        const rutaFoto = path.join(dirModelo, fotoLista)
        try {
          const res = await cloudinary.uploader.upload(rutaFoto, {
            folder: "motos-fernandez/modelos",
            // Normaliza a JPG calidad buena, máx 2000px lado largo
            transformation: [
              { width: 2000, height: 2000, crop: "limit", quality: "auto:good", fetch_format: "jpg" },
            ],
          })
          await prisma.modelo.update({
            where: { id: modelo.id },
            data: {
              fotos: [res.secure_url],
              activo: true, // ya tiene foto → publicable
            },
          })
          subidas++
          console.log(`✅ ${marcaDB} ${modelo.nombre}`)
        } catch (e) {
          errores.push(
            `${marcaFolder}/${carpeta} — error subiendo: ${e.message}`
          )
        }
      }
    }

    console.log(`\nSubidas + activadas: ${subidas} · Salteadas (ya tenían): ${salteadas}`)
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

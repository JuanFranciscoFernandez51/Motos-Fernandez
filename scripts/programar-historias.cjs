#!/usr/bin/env node
/**
 * Programa las historias de Instagram (saludos diarios) en ScheduledStory.
 *
 * Lee el CALENDARIO.csv de la carpeta de historias, sube cada JPG TAL CUAL a
 * Cloudinary (sin transformaciones ni IA — regla de costos; las imágenes ya
 * vienen 1080×1920 listas para Story) y crea una fila ScheduledStory por cada
 * una con su fecha/hora convertida a UTC (AR es UTC-3 → UTC = AR + 3h).
 *
 * El cron publish-scheduled las publica como IG Story cuando llega la fecha.
 * NO publica nada en el momento: solo programa.
 *
 * Idempotente: si ya existe una ScheduledStory con el mismo `archivo`, la
 * saltea (no re-sube a Cloudinary ni duplica). Así se puede correr primero
 * solo el test y después el resto sin pisar nada.
 *
 * Uso:
 *   node scripts/programar-historias.cjs --dry-run            (no sube ni escribe; solo muestra)
 *   node scripts/programar-historias.cjs --solo=2026-10-26_lunes_buen-lunes.jpg   (solo el test)
 *   node scripts/programar-historias.cjs                      (todas las pendientes)
 *   node scripts/programar-historias.cjs --carpeta="/ruta/a/HISTORIAS MOTOS FERNANDEZ"
 */

require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")
const { v2: cloudinary } = require("cloudinary")

// ---- args ----
const args = process.argv.slice(2)
const DRY = args.includes("--dry-run")
// --ahora: fuerza scheduledAt = hace 2 min (para el test: que el cron la levante ya).
const AHORA = args.includes("--ahora")
const soloArg = args.find((a) => a.startsWith("--solo="))
const SOLO = soloArg ? soloArg.split("=")[1] : null
const carpArg = args.find((a) => a.startsWith("--carpeta="))
const CARPETA =
  (carpArg ? carpArg.split("=")[1] : null) ||
  "/Users/juanfri/Desktop/HISTORIAS MOTOS FERNANDEZ"

const CSV = path.join(CARPETA, "CALENDARIO.csv")
const FOLDER = "motos-fernandez/historias"

// ---- Cloudinary (misma config que src/lib/cloudinary.ts) ----
const clean = (v) => (v ? String(v).trim().replace(/[\s\t\n\r]/g, "") || undefined : undefined)
cloudinary.config({
  cloud_name:
    clean(process.env.CLOUDINARY_CLOUD_NAME) ||
    clean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) ||
    "dgtlyzyra",
  api_key: clean(process.env.CLOUDINARY_API_KEY),
  api_secret: clean(process.env.CLOUDINARY_API_SECRET),
})

// ---- mini parser CSV (maneja comillas, "" escapadas y comas internas) ----
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ",") { row.push(field); field = "" }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
      else if (c === "\r") { /* ignore */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function esDM(v) {
  return ["sí", "si", "yes", "true", "1"].includes(String(v || "").trim().toLowerCase())
}

async function main() {
  // Leer CSV (quitar BOM)
  const raw = fs.readFileSync(CSV, "utf8").replace(/^﻿/, "")
  const rows = parseCSV(raw).filter((r) => r.length && r.some((c) => c !== ""))
  const header = rows.shift().map((h) => h.trim())
  const col = (name) => header.indexOf(name)
  const iFecha = col("fecha"), iTema = col("tema"), iArch = col("archivo"),
        iHora = col("hora_sugerida"), iDM = col("pide_respuesta_por_DM")

  let items = rows.map((r) => ({
    fecha: r[iFecha].trim(),
    tema: r[iTema].trim(),
    archivo: r[iArch].trim(),
    hora: r[iHora].trim(),
    pideDM: esDM(r[iDM]),
  }))
  if (SOLO) items = items.filter((it) => it.archivo === SOLO)

  if (!items.length) {
    console.log("No hay historias para procesar (¿--solo mal escrito?).")
    return
  }

  const p = new PrismaClient()
  const programadas = []
  const saltadas = []
  try {
    for (const it of items) {
      // AR (UTC-3) -> UTC. Con --ahora, forzamos "hace 2 min" para el test.
      const [Y, M, D] = it.fecha.split("-").map(Number)
      const [hh, mm] = it.hora.split(":").map(Number)
      const scheduledAt = AHORA
        ? new Date(Date.now() - 2 * 60 * 1000)
        : new Date(Date.UTC(Y, M - 1, D, hh + 3, mm, 0, 0))
      const fechaAR = scheduledAt.toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour12: false,
      })

      // Idempotencia por archivo
      const existe = await p.scheduledStory.findFirst({ where: { archivo: it.archivo } })
      if (existe) {
        saltadas.push({ archivo: it.archivo, motivo: `ya existe (${existe.status})` })
        continue
      }

      const local = path.join(CARPETA, it.archivo)
      if (!fs.existsSync(local)) {
        saltadas.push({ archivo: it.archivo, motivo: "no está el JPG en la carpeta" })
        continue
      }

      if (DRY) {
        programadas.push({ archivo: it.archivo, fechaAR, dm: it.pideDM, url: "(dry-run, no subido)" })
        continue
      }

      // Subir TAL CUAL (sin transformaciones ni IA). 1 upload por imagen.
      const up = await cloudinary.uploader.upload(local, {
        folder: FOLDER,
        resource_type: "image",
        use_filename: true,
        unique_filename: false,
        overwrite: true,
      })

      const row = await p.scheduledStory.create({
        data: {
          imageUrl: up.secure_url,
          publicId: up.public_id,
          scheduledAt,
          tema: it.tema,
          archivo: it.archivo,
          pideDM: it.pideDM,
          status: "PENDING",
        },
      })
      programadas.push({ archivo: it.archivo, fechaAR, dm: it.pideDM, url: up.secure_url, id: row.id })
    }

    console.log(`\n=== HISTORIAS ${DRY ? "(DRY-RUN) " : ""}===`)
    programadas.forEach((x) =>
      console.log(`  ${x.fechaAR}  ${x.dm ? "📩DM " : "    "} ${x.archivo}`)
    )
    console.log(`\nProgramadas: ${programadas.length}  |  Saltadas: ${saltadas.length}`)
    if (saltadas.length) {
      console.log("\nSaltadas:")
      saltadas.forEach((s) => console.log(`  ${s.archivo} — ${s.motivo}`))
    }
  } finally {
    await p.$disconnect()
  }
}

main().catch((e) => { console.error("❌", e); process.exit(1) })

#!/usr/bin/env node
/**
 * Sube y asocia las fotos NUEVAS de BMW (carpeta "fotos 0km nuevas") a sus
 * modelos 0KM, con mapeo EXPLÍCITO y cuidadoso porque los nombres BMW son
 * confusos (R 1300 GS base vs Adventure, F800/F900/F900 Adventure/F900
 * Urban, S1000 XR vs S1000 RR).
 *
 * - Modelos sin fotos: sube todo, crea colores, los deja activos.
 * - R 1300 GS Adventure (YA tiene fotos): modo APPEND — agrega solo los
 *   colores nuevos (Karakorum, Roja) sin pisar los existentes.
 *
 * Idempotente. Uso: node scripts/subir-fotos-bmw.cjs [--dry-run]
 */

require("dotenv").config({ path: ".env.local", override: true })
const fs = require("fs")
const path = require("path")
const { v2: cloudinary } = require("cloudinary")
const { PrismaClient } = require("@prisma/client")

const DRY = process.argv.includes("--dry-run") || process.argv.includes("--dry")

cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dgtlyzyra").trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
})

const BASE = "/Users/juanfri/Desktop/MOTOS FERNANDEZ/fotos 0km nuevas"

const HEX = {
  Sport: "#1B3A6B", "Triple Black": "#1A1A1A", Blanco: "#ECECEC", Negro: "#1A1A1A",
  "Azul Passion": "#0E2C66", Trophy: "#C7402E", Tricolor: "#1B3A6B", Rojo: "#B11212",
  "Imperial Blue": "#0E2C66", Tramuntana: "#7A6A55", Gris: "#6B6B6B", Karakorum: "#8A8576",
  Roja: "#B11212", Estándar: "#6B6B6B",
}
const hexDe = (c) => HEX[c] || "#6B6B6B"

// Modelos a CREAR/REEMPLAZAR fotos (los que no tienen fotos todavía).
const NUEVOS = [
  {
    nombre: "F 800 GS",
    colores: [
      { nombre: "Sport", archivos: ["BMW F800 GS SPORT.jpg"] },
      { nombre: "Triple Black", archivos: ["BMW F800 GS TRIPLE BLACK .jpg"] },
      { nombre: "Blanco", archivos: ["BMW F800 GS WHITE.jpg"] },
    ],
  },
  {
    nombre: "F 900 GS",
    colores: [
      { nombre: "Azul Passion", archivos: ["BMW F900 GS AZUL PASSION .jpg"] },
      { nombre: "Triple Black", archivos: ["BMW F900 GS TRIPLE BLACK .jpg"] },
      { nombre: "Trophy", archivos: ["BMW F900 GS TROPHY.jpg", "BMW F900 GS TROPHY 2026.jpg"] },
    ],
  },
  {
    nombre: "F 900 GS Urban",
    colores: [{ nombre: "Blanco", archivos: ["BMW F900 GS URBAN WHITE .jpg"] }],
  },
  {
    nombre: "F 900 GS Adventure",
    colores: [
      { nombre: "Negro", archivos: ["BMW F 900 GS ADVENTURE NEGRO .jpg"] },
      { nombre: "Tricolor", archivos: ["BMW F900GS ADVENTURE TRICOLOR.jpg"] },
    ],
  },
  {
    nombre: "R 1300 GS",
    colores: [
      { nombre: "Imperial Blue", archivos: ["BMW GS1300 719 IMPERIAL BLUE.jpg"] },
      { nombre: "Tramuntana", archivos: ["BMW GS1300 719 TRAMUNTANA.jpg"] },
      { nombre: "Rojo", archivos: ["BMW GS1300 RED.jpg"] },
      { nombre: "Triple Black", archivos: ["BMW GS1300 TRIPLE BLACK .jpg"] },
      { nombre: "Trophy", archivos: ["BMW GS1300 TROPHY .jpg", "BMW GS1300 TROPHY BLANCA.jpg"] },
      { nombre: "Blanco", archivos: ["BMW GS1300 WHITE .jpg"] },
    ],
  },
  {
    nombre: "S 1000 XR",
    colores: [
      { nombre: "Estándar", archivos: ["BMW S 1000 XR.jpg", "BMW S1000 XR.jpg"] },
      { nombre: "Negro", archivos: ["BMW S1000 XR NEGRO.jpg"] },
    ],
  },
  {
    nombre: "S 1000 RR",
    colores: [
      { nombre: "Blanco", archivos: ["BMW S1000RR BLANCO.jpg"] },
      { nombre: "Gris", archivos: ["BMW S1000RR GRIS.jpg"] },
      { nombre: "Negro", archivos: ["BMW S1000RR NEGRO.jpg"] },
    ],
  },
]

// R 1300 GS Adventure ya tiene fotos → solo AGREGAR estos colores nuevos.
const APPEND = {
  nombre: "R 1300 GS Adventure",
  colores: [
    { nombre: "Karakorum", archivos: ["BMW GS 1300 ADVENTURE KARAKORUMI.png"] },
    { nombre: "Roja", archivos: ["BMW GS1300 ADVENTURE ROJA .png"] },
  ],
}

// Archivos que NO se usan (duplican un color existente) — solo se reportan.
const SIN_USO = ["BMW GS 1300 ADVENTURE NEGRA.png", "BMW GS 1300 TROPHY.png"]

async function subir(ruta) {
  const res = await cloudinary.uploader.upload(ruta, {
    folder: "motos-fernandez/modelos",
    transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto:good", fetch_format: "jpg" }],
  })
  return res.secure_url
}

async function main() {
  const prisma = new PrismaClient()
  let modelosOk = 0, fotos = 0, colores = 0
  const errores = [], noMatch = []

  try {
    // Validar archivos
    for (const g of [...NUEVOS, APPEND]) {
      for (const c of g.colores) for (const a of c.archivos) {
        if (!fs.existsSync(path.join(BASE, a))) errores.push(`${g.nombre} — FALTA: ${a}`)
      }
    }
    if (errores.length) { console.log("ARCHIVOS FALTANTES:"); errores.forEach((e) => console.log("  ", e)); }

    // ---- Modelos nuevos (reemplazo de placeholder) ----
    for (const g of NUEVOS) {
      const m = await prisma.modelo.findFirst({
        where: { marca: "BMW", nombre: g.nombre, condicion: "0KM" },
        select: { id: true, nombre: true, fotos: true, colores: { select: { id: true } } },
      })
      if (!m) { noMatch.push(`BMW "${g.nombre}" — sin match en DB`); continue }
      if (m.fotos.some((f) => f.includes("cloudinary"))) {
        console.log(`⏭  ${g.nombre} — ya tenía fotos`); continue
      }
      console.log(`→ ${g.nombre} (${g.colores.length} colores, ${g.colores.reduce((n, c) => n + c.archivos.length, 0)} fotos)`)
      if (DRY) { g.colores.forEach((c) => c.archivos.forEach((a) => console.log(`   [${c.nombre}] ${a}`))); continue }

      const urls = [], colorRows = []
      for (const c of g.colores) {
        let primera = null
        for (const a of c.archivos) {
          try { const u = await subir(path.join(BASE, a)); urls.push(u); fotos++; if (!primera) primera = u }
          catch (e) { errores.push(`${g.nombre}/${a}: ${e.message}`) }
        }
        if (primera) colorRows.push({ nombre: c.nombre, hex: hexDe(c.nombre), foto: primera, modeloId: m.id })
      }
      if (!urls.length) { errores.push(`${g.nombre} — no se subió nada`); continue }
      await prisma.modelo.update({ where: { id: m.id }, data: { fotos: urls, activo: true } })
      if (colorRows.length && m.colores.length === 0) {
        await prisma.modeloColor.createMany({ data: colorRows })
        colores += colorRows.length
      }
      modelosOk++
      console.log(`   ✅ ${urls.length} fotos · ${colorRows.length} colores · activo`)
    }

    // ---- Append: R 1300 GS Adventure ----
    const adv = await prisma.modelo.findFirst({
      where: { marca: "BMW", nombre: APPEND.nombre, condicion: "0KM" },
      select: { id: true, fotos: true, colores: { select: { nombre: true } } },
    })
    if (adv) {
      console.log(`→ ${APPEND.nombre} (APPEND)`)
      const existentes = new Set(adv.colores.map((c) => c.nombre.toLowerCase()))
      const nuevasUrls = [...adv.fotos]
      const colorRows = []
      for (const c of APPEND.colores) {
        if (existentes.has(c.nombre.toLowerCase())) { console.log(`   (ya tiene ${c.nombre}, salto)`); continue }
        if (DRY) { c.archivos.forEach((a) => console.log(`   + [${c.nombre}] ${a}`)); continue }
        let primera = null
        for (const a of c.archivos) {
          try { const u = await subir(path.join(BASE, a)); nuevasUrls.push(u); fotos++; if (!primera) primera = u }
          catch (e) { errores.push(`${APPEND.nombre}/${a}: ${e.message}`) }
        }
        if (primera) colorRows.push({ nombre: c.nombre, hex: hexDe(c.nombre), foto: primera, modeloId: adv.id })
      }
      if (!DRY && colorRows.length) {
        await prisma.modelo.update({ where: { id: adv.id }, data: { fotos: nuevasUrls } })
        await prisma.modeloColor.createMany({ data: colorRows })
        colores += colorRows.length
        console.log(`   ✅ +${colorRows.length} colores nuevos`)
      }
    }

    console.log(`\nRESUMEN${DRY ? " (DRY RUN)" : ""}`)
    console.log(`Modelos con fotos: ${modelosOk} · Fotos subidas: ${fotos} · Colores creados: ${colores}`)
    if (noMatch.length) { console.log("\nNO matcheados:"); noMatch.forEach((e) => console.log("  ", e)) }
    if (SIN_USO.length) { console.log("\nArchivos sin usar (duplican color existente):"); SIN_USO.forEach((e) => console.log("  ", e)) }
    if (errores.length) { console.log("\nErrores:"); errores.forEach((e) => console.log("  ", e)) }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error("❌", e); process.exit(1) })

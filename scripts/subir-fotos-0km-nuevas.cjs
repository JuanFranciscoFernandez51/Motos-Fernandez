#!/usr/bin/env node
/**
 * Sube las fotos 0KM nuevas (carpeta "fotos 0km nuevas" del Desktop) a
 * Cloudinary y las asocia a sus modelos en la DB, reemplazando el
 * placeholder (/images/logo-clasico.png). Además crea los ModeloColor
 * (selector de colores de la ficha) con su hex y foto representativa.
 *
 * - Mapeo explícito archivo → modelo (nombre EXACTO en DB), agrupado por
 *   color. La foto principal va primero (toma "limpia" sin número del
 *   primer color), luego el resto agrupado por color.
 * - Idempotente: si el modelo ya tiene una foto de Cloudinary, lo saltea.
 * - REGLA Francisco: los modelos que reciben fotos quedan activo:true.
 *
 * Uso:
 *   node scripts/subir-fotos-0km-nuevas.cjs            (sube de verdad)
 *   node scripts/subir-fotos-0km-nuevas.cjs --dry-run  (solo imprime el matcheo)
 */

require("dotenv").config({ path: ".env.local", override: true })
const fs = require("fs")
const path = require("path")
const { v2: cloudinary } = require("cloudinary")
const { PrismaClient } = require("@prisma/client")

const DRY = process.argv.includes("--dry-run") || process.argv.includes("--dry")

cloudinary.config({
  cloud_name: (
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "dgtlyzyra"
  ).trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || "").trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || "").trim(),
})

const BASE = "/Users/juanfri/Desktop/MOTOS FERNANDEZ/fotos 0km nuevas"

// hex por color (según REGLA Francisco)
const HEX = {
  Azul: "#1B3A6B",
  Celeste: "#5BA8D6",
  Negro: "#1A1A1A",
  "Negro y Dorado": "#1A1A1A",
  Blanco: "#ECECEC",
  Rojo: "#B11212",
  Gris: "#6B6B6B",
  "Gris Oscuro": "#444444",
  "Gris Claro": "#9A9A9A",
  Verde: "#2E5E3A",
  "Verde y Dorada": "#2E5E3A",
  Arena: "#C9B68B",
  "Triple Black": "#101010",
  Trophy: "#1B3A6B",
  Estandar: "#6B6B6B",
}

/**
 * Cada entrada: nombre EXACTO del Modelo en DB → marca + lista de colores.
 * Cada color tiene: { nombre, archivos: [...] } (principal/limpia primero).
 * El primer color del array es el color "principal" del modelo.
 */
const MAPA = [
  {
    marca: "Yamaha",
    nombre: "FZ 4.0 ABS",
    colores: [
      { nombre: "Negro", archivos: ["FZ V4.0  NEGRA.jpg", "FZ V4.0 NEGRA 1.jpg"] },
      { nombre: "Azul", archivos: ["FZ V4.0 AZUL .jpg"] },
      { nombre: "Negro y Dorado", archivos: ["FZ V4.0 NEGRA Y DORADO.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "FZ 25",
    colores: [
      { nombre: "Azul", archivos: ["FZ25 AZUL.jpg"] },
      { nombre: "Blanco", archivos: ["FZ25 BLANCA.jpg"] },
      { nombre: "Rojo", archivos: ["FZ25 ROJA.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "Fascino 125",
    colores: [{ nombre: "Rojo", archivos: ["Fascino Roja .jpg"] }],
  },
  {
    marca: "Yamaha",
    nombre: "MT-03",
    colores: [
      { nombre: "Azul", archivos: ["MT03 AZUL.jpg", "MT03 AZUL 1.jpg"] },
      { nombre: "Negro", archivos: ["MT03 NEGRA.jpg", "MT03 NEGRA 1.jpg"] },
      { nombre: "Blanco", archivos: ["MT03 BLANCA.jpg", "MT03 BLANCA 1.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "MT-07",
    colores: [
      { nombre: "Azul", archivos: ["MT07 AZUL.jpg", "MT07 AZUL 1.jpg"] },
      { nombre: "Negro", archivos: ["MT07 NEGRA.jpg", "MT07 NEGRA 1.jpg"] },
      { nombre: "Blanco", archivos: ["MT07 BLANCA.jpg", "MT07 BLANCA 1 .jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "MT-09",
    colores: [
      { nombre: "Azul", archivos: ["MT09 AZUL.jpg", "MT09 AZUL 1jpg.jpg"] },
      { nombre: "Negro", archivos: ["MT09 NEGRO.jpg", "MT09 NEGRO 1 .jpg"] },
      { nombre: "Blanco", archivos: ["MT09 BLANCO.jpg", "MT09 BLANCA 1.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "NMAX 155 Connected",
    colores: [
      { nombre: "Negro", archivos: ["NMAX 150 NEGRO.jpg"] },
      { nombre: "Blanco", archivos: ["NMAX 150 BLANCO.jpg"] },
      { nombre: "Gris", archivos: ["NMAX 150 GRIS.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "NMAX 300 Connected",
    colores: [
      { nombre: "Negro", archivos: ["NMAX 300 NEGRO.jpg"] },
      { nombre: "Azul", archivos: ["NMAX 300 AZUL .jpg"] },
      { nombre: "Gris Oscuro", archivos: ["NMAX 300 GRIS OSCURO.jpg"] },
      { nombre: "Gris Claro", archivos: ["NMAX 300 GRSI CLARO.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "RayZR 125 Fi",
    colores: [
      { nombre: "Azul", archivos: ["Ray Z Azul.jpg"] },
      { nombre: "Negro", archivos: ["Ray Z Negra.jpg"] },
      { nombre: "Rojo", archivos: ["Ray Z Roja.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "Tenere 700 (XTZ690)",
    colores: [
      { nombre: "Azul", archivos: ["TENERE700 AZUL.jpg", "TENERE 700 AZUL1.jpg", "TENERE 700 AZUL 2.jpg"] },
      { nombre: "Celeste", archivos: ["TENERE700 CELESTE.jpg", "TENERE 700 CELESTE 1 .jpg"] },
      { nombre: "Gris", archivos: ["TENERE700 GRIS.jpg", "TENERE 700 GRIS 1.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "TT-R230",
    colores: [
      { nombre: "Azul", archivos: ["TTR230.jpg", "TTR230 1.jpg", "TTR230 2.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "Yamaha XTZ 125",
    colores: [
      { nombre: "Azul", archivos: ["XTZ 125 AZUL.jpg", "XTZ125 AZUL 1 .jpg"] },
      { nombre: "Blanco", archivos: ["XTZ125 BLANCA.jpg", "XTZ 125 BLACNA 1 .jpg"] },
      { nombre: "Negro", archivos: ["XTZ125 NEGRA .jpg", "XTZ125 NEGRA 1 .jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "XTZ 250 ABS",
    colores: [
      { nombre: "Azul", archivos: ["XTZ250 AZUL .jpg", "XTZ250 AZUL 1.jpg"] },
      { nombre: "Negro", archivos: ["XTZ250 NEGRA.jpg", "XTZ250 NEGRA 1.jpg"] },
      { nombre: "Arena", archivos: ["XTZ250 ARENA.jpg", "XTZ250 ARENA 1.jpg"] },
    ],
  },
  {
    marca: "Honda",
    nombre: "Honda Wave",
    colores: [
      { nombre: "Blanco", archivos: ["WAVE BASE BLANCA.WEBP"] },
      { nombre: "Negro", archivos: ["WAVE BASE NEGRA.WEBP"] },
      { nombre: "Rojo", archivos: ["WAVE BASE ROJA .WEBP"] },
      { nombre: "Gris", archivos: ["WAVE BASE GRIS.WEBP"] },
    ],
  },
  {
    marca: "BMW",
    nombre: "R 1300 GS Adventure",
    colores: [
      { nombre: "Trophy", archivos: ["bmw 1300 adventure trophy.avif", "bmw 1300 adventure.avif"] },
      { nombre: "Triple Black", archivos: ["bmw 1300 adventure triple black .avif"] },
      { nombre: "Verde y Dorada", archivos: ["bmw 1300 adventure verde y dorada.avif"] },
    ],
  },
  // Yamaha deportiva + línea YZ de competición (modelos creados en
  // scripts/crear-yamaha-competicion.cjs).
  {
    marca: "Yamaha",
    nombre: "R7",
    colores: [
      {
        nombre: "Azul",
        archivos: [
          "YAMAHA R7 AZUL .jpg",
          "YAMAHA R7 AZUL 1.jpg",
          "YAMAHA R7 AZUL 2.jpg",
        ],
      },
      { nombre: "Negro", archivos: ["YAMAHA R7 NEGRA.jpg", "YAMAHA R7 NEGRA Q.jpg"] },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "YZ 125",
    colores: [{ nombre: "Azul", archivos: ["YZ125.jpg", "YZ125 1.jpg", "YZ125 2.jpg"] }],
  },
  {
    marca: "Yamaha",
    nombre: "YZ 250",
    colores: [
      {
        nombre: "Azul",
        archivos: ["YZ250.jpg", "YZ250 1.jpg", "YZ250 2.jpg", "YZ250 3.jpg", "YZ250 4.jpg"],
      },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "YZ 250F",
    colores: [
      {
        nombre: "Azul",
        archivos: ["YZ250F.jpg", "YZ250F 1.jpg", "YZ250F 2.jpg", "YZ250F 3.jpg"],
      },
    ],
  },
  {
    marca: "Yamaha",
    nombre: "YZ 450F",
    colores: [
      { nombre: "Azul", archivos: ["YZ450F .jpg", "YZ450F 1 .jpg", "YZ450F 2 .jpg"] },
    ],
  },
]

// Archivos SIN modelo en la DB (no se crea nada, solo se reporta).
const SIN_MODELO = {
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

function hexDe(nombreColor) {
  return HEX[nombreColor] || "#6B6B6B"
}

async function main() {
  const prisma = new PrismaClient()
  let modelosOk = 0
  let fotosSubidas = 0
  let coloresCreados = 0
  let salteados = 0
  const errores = []
  const noMatch = []

  try {
    // Validación previa: confirmar que todos los archivos existen.
    for (const grupo of MAPA) {
      for (const col of grupo.colores) {
        for (const a of col.archivos) {
          if (!fs.existsSync(path.join(BASE, a))) {
            errores.push(`${grupo.nombre} — FALTA archivo: ${a}`)
          }
        }
      }
    }

    for (const grupo of MAPA) {
      const m = await prisma.modelo.findFirst({
        where: {
          marca: { equals: grupo.marca, mode: "insensitive" },
          nombre: grupo.nombre,
          condicion: "0KM",
        },
        select: {
          id: true,
          nombre: true,
          fotos: true,
          colores: { select: { id: true, nombre: true } },
        },
      })

      if (!m) {
        noMatch.push(`${grupo.marca} "${grupo.nombre}" — sin match en DB`)
        continue
      }
      if (m.fotos.some((f) => f.includes("cloudinary"))) {
        salteados++
        console.log(`⏭  ${grupo.marca} ${grupo.nombre} — ya tenía fotos`)
        continue
      }

      // Subir por color, guardando la primera URL de cada color para ModeloColor.
      const urls = []
      const colorFoto = {} // nombreColor -> primera URL
      const totalArchivos = grupo.colores.reduce((n, c) => n + c.archivos.length, 0)

      console.log(
        `\n→ ${grupo.marca} ${grupo.nombre} (${grupo.colores.length} colores, ${totalArchivos} fotos)`
      )

      for (const col of grupo.colores) {
        for (const a of col.archivos) {
          const ruta = path.join(BASE, a)
          if (!fs.existsSync(ruta)) {
            errores.push(`${grupo.nombre}/${a} — no existe, salteado`)
            continue
          }
          if (DRY) {
            console.log(`   [${col.nombre}] ${a}`)
            urls.push(`(dry)${a}`)
            if (!colorFoto[col.nombre]) colorFoto[col.nombre] = `(dry)${a}`
            continue
          }
          try {
            const url = await subir(ruta)
            urls.push(url)
            fotosSubidas++
            if (!colorFoto[col.nombre]) colorFoto[col.nombre] = url
            console.log(`   ✓ [${col.nombre}] ${a}`)
          } catch (e) {
            errores.push(`${grupo.nombre}/${a} — error upload: ${e.message}`)
          }
        }
      }

      if (urls.length === 0) {
        errores.push(`${grupo.nombre} — no se subió ninguna foto`)
        continue
      }

      if (DRY) {
        console.log(
          `   colores a crear: ${grupo.colores
            .map((c) => `${c.nombre}(${hexDe(c.nombre)})`)
            .join(", ")}`
        )
        modelosOk++
        continue
      }

      // Setear fotos + activar
      await prisma.modelo.update({
        where: { id: m.id },
        data: { fotos: urls, activo: true },
      })

      // Crear ModeloColor que no existan aún
      const existentes = new Set(
        m.colores.map((c) => c.nombre.trim().toLowerCase())
      )
      for (const col of grupo.colores) {
        if (existentes.has(col.nombre.trim().toLowerCase())) continue
        await prisma.modeloColor.create({
          data: {
            nombre: col.nombre,
            hex: hexDe(col.nombre),
            foto: colorFoto[col.nombre] || urls[0],
            modeloId: m.id,
          },
        })
        coloresCreados++
      }

      modelosOk++
      console.log(`   ✅ ${urls.length} fotos · ${grupo.colores.length} colores`)
    }

    // Reportar archivos sin modelo
    for (const [etiqueta, archivos] of Object.entries(SIN_MODELO)) {
      noMatch.push(`${etiqueta} — ${archivos.length} archivos: ${archivos.join(", ")}`)
    }

    console.log(
      `\n${"=".repeat(60)}\nRESUMEN${DRY ? " (DRY RUN — no se subió nada)" : ""}`
    )
    console.log(`Modelos actualizados: ${modelosOk}`)
    console.log(`Fotos subidas: ${fotosSubidas}`)
    console.log(`Colores creados: ${coloresCreados}`)
    console.log(`Salteados (ya tenían fotos): ${salteados}`)
    if (errores.length) {
      console.log(`\nERRORES (${errores.length}):`)
      errores.forEach((e) => console.log("  -", e))
    }
    if (noMatch.length) {
      console.log(`\nNO MATCHEADOS / SIN MODELO EN DB (revisar Francisco):`)
      noMatch.forEach((e) => console.log("  -", e))
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})

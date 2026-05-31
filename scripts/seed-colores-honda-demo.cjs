#!/usr/bin/env node
/**
 * Carga colores demo (ModeloColor) para las Honda 0KM que ya tienen fotos
 * por color, así el selector de colores de la ficha muestra algo real.
 *
 * Cada color apunta por índice a una foto que ya está en modelo.fotos[],
 * de modo que al elegir el color la galería salta a esa imagen.
 *
 * Idempotente: si el modelo ya tiene colores cargados, lo saltea.
 *
 * Uso: node scripts/seed-colores-honda-demo.cjs
 */

require("dotenv").config({ path: ".env.local", override: true })
const { PrismaClient } = require("@prisma/client")

// nombre exacto en DB → colores (idx = posición en modelo.fotos)
const SEED = {
  "PCX 160": [
    { nombre: "Blanco Perla", hex: "#ECECEC", idx: 0 },
    { nombre: "Azul", hex: "#1B3A6B", idx: 1 },
    { nombre: "Negro", hex: "#1A1A1A", idx: 2 },
  ],
  NC750X: [
    { nombre: "Blanco", hex: "#E8E8E8", idx: 0 },
    { nombre: "Rojo", hex: "#B11212", idx: 1 },
    { nombre: "Verde", hex: "#2E5E3A", idx: 2 },
  ],
  "TRX420 (quad)": [
    { nombre: "Rojo", hex: "#B11212", idx: 0 },
    { nombre: "Negro", hex: "#1A1A1A", idx: 1 },
    { nombre: "Viñedos", hex: "#4B5320", idx: 2 },
  ],
}

async function main() {
  const prisma = new PrismaClient()
  let creados = 0
  let salteados = 0
  const errores = []

  try {
    for (const [nombre, colores] of Object.entries(SEED)) {
      const m = await prisma.modelo.findFirst({
        where: {
          marca: { equals: "Honda", mode: "insensitive" },
          nombre,
          condicion: "0KM",
        },
        select: { id: true, nombre: true, fotos: true, colores: { select: { id: true } } },
      })
      if (!m) {
        errores.push(`${nombre} — sin match en DB`)
        continue
      }
      if (m.colores.length > 0) {
        salteados++
        console.log(`⏭  ${nombre} — ya tenía ${m.colores.length} colores`)
        continue
      }

      const data = colores
        .filter((c) => m.fotos[c.idx])
        .map((c) => ({
          nombre: c.nombre,
          hex: c.hex,
          foto: m.fotos[c.idx],
          modeloId: m.id,
        }))

      if (data.length === 0) {
        errores.push(`${nombre} — sin fotos para mapear`)
        continue
      }

      await prisma.modeloColor.createMany({ data })
      creados += data.length
      console.log(`✅ ${nombre} — ${data.length} colores: ${data.map((d) => d.nombre).join(", ")}`)
    }

    console.log(`\nColores creados: ${creados} · Modelos salteados: ${salteados}`)
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

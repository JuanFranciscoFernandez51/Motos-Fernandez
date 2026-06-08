#!/usr/bin/env node
/**
 * Crea los 5 modelos Yamaha de deportiva/competición que faltaban en el
 * catálogo 0KM (R7 + línea YZ de motocross), con precio "Consultar"
 * (precio=null) y specs técnicas cargadas (datos de fichas oficiales).
 *
 * Quedan con placeholder + activo:false; las fotos las sube después
 * scripts/subir-fotos-0km-nuevas.cjs (que las pasa a activas).
 *
 * Idempotente: si ya existe un modelo con ese nombre 0KM, lo saltea.
 */

require("dotenv").config({ path: ".env.local", override: true })
const { PrismaClient } = require("@prisma/client")

const PLACEHOLDER = "/images/logo-clasico.png"

const MODELOS = [
  {
    nombre: "R7",
    segmento: "Supersport",
    desc: "Yamaha R7 (YZF-R7) 0KM — Supersport con motor CP2 de 689 cc. Unidad nueva, consultá disponibilidad y financiación.",
    specs: {
      Motor: "Bicilíndrico en línea, 4T, DOHC, CP2 (cigüeñal 270°)",
      Cilindrada: "689 cc",
      "Potencia máxima": "73,4 CV (54 kW) @ 8.750 rpm",
      "Torque máximo": "68 Nm @ 6.500 rpm",
      "Diámetro x carrera": "80,0 x 68,6 mm",
      Alimentación: "Inyección electrónica",
      Refrigeración: "Líquida",
      Transmisión: "6 velocidades",
      Arranque: "Eléctrico",
      "Freno delantero": "Doble disco 298 mm, ABS",
      "Freno trasero": "Disco 245 mm, ABS",
      "Capacidad de tanque": "13 litros",
      "Peso en orden de marcha": "188 kg",
      "Asiento (altura)": "835 mm",
    },
  },
  {
    nombre: "YZ 125",
    segmento: "Motocross 2T",
    desc: "Yamaha YZ 125 0KM — Motocross de 2 tiempos, 125 cc. Unidad nueva de competición, consultá disponibilidad.",
    specs: {
      Motor: "Monocilíndrico, 2 tiempos, refrigerado por líquido",
      Cilindrada: "125 cc",
      "Diámetro x carrera": "54,0 x 54,5 mm",
      Alimentación: "Carburador Keihin PWK38S",
      Transmisión: "6 velocidades",
      Arranque: "Pedal",
      "Freno delantero": "Disco 270 mm",
      "Freno trasero": "Disco 240 mm",
      "Capacidad de tanque": "8 litros",
      "Peso en orden de marcha": "94 kg",
      "Asiento (altura)": "986 mm",
    },
  },
  {
    nombre: "YZ 250",
    segmento: "Motocross 2T",
    desc: "Yamaha YZ 250 0KM — Motocross de 2 tiempos, 249 cc. Unidad nueva de competición, consultá disponibilidad.",
    specs: {
      Motor: "Monocilíndrico, 2 tiempos, refrigerado por líquido",
      Cilindrada: "249 cc",
      "Diámetro x carrera": "66,4 x 72,0 mm",
      Alimentación: "Carburador Keihin PWK38S",
      Transmisión: "5 velocidades",
      Arranque: "Pedal",
      "Freno delantero": "Disco 270 mm",
      "Freno trasero": "Disco 245 mm",
      "Capacidad de tanque": "8 litros",
      "Peso en orden de marcha": "104 kg",
      "Asiento (altura)": "998 mm",
    },
  },
  {
    nombre: "YZ 250F",
    segmento: "Motocross 4T",
    desc: "Yamaha YZ 250F 0KM — Motocross de 4 tiempos, 250 cc, chasis de aluminio. Unidad nueva de competición, consultá disponibilidad.",
    specs: {
      Motor: "Monocilíndrico, 4T, DOHC, 4 válvulas, refrigerado por líquido",
      Cilindrada: "250 cc",
      "Diámetro x carrera": "77,0 x 53,6 mm",
      "Relación de compresión": "13,8:1",
      Alimentación: "Inyección electrónica",
      Transmisión: "5 velocidades",
      Arranque: "Eléctrico",
      "Freno delantero": "Disco 270 mm",
      "Freno trasero": "Disco 240 mm",
      "Capacidad de tanque": "6,2 litros",
      "Peso en orden de marcha": "107 kg",
      "Asiento (altura)": "965 mm",
    },
  },
  {
    nombre: "YZ 450F",
    segmento: "Motocross 4T",
    desc: "Yamaha YZ 450F 0KM — Motocross de 4 tiempos, 450 cc, máxima potencia. Unidad nueva de competición, consultá disponibilidad.",
    specs: {
      Motor: "Monocilíndrico, 4T, DOHC, 4 válvulas, refrigerado por líquido",
      Cilindrada: "449 cc",
      "Diámetro x carrera": "97,0 x 60,8 mm",
      "Relación de compresión": "13,0:1",
      Alimentación: "Inyección electrónica",
      Transmisión: "5 velocidades",
      Arranque: "Eléctrico",
      "Freno delantero": "Disco 270 mm",
      "Freno trasero": "Disco 240 mm",
      "Capacidad de tanque": "6,2 litros",
      "Peso en orden de marcha": "109 kg",
      "Asiento (altura)": "965 mm",
    },
  },
]

async function main() {
  const prisma = new PrismaClient()
  let creados = 0
  let salteados = 0

  try {
    // Próximo número de código CAT0KM-XXXX
    const existentes = await prisma.modelo.findMany({
      where: { codigo: { startsWith: "CAT0KM-" } },
      select: { codigo: true },
    })
    let maxNum = existentes
      .map((m) => parseInt(m.codigo.split("-")[1] || "0", 10))
      .filter(Number.isFinite)
      .reduce((a, b) => Math.max(a, b), 0)

    for (const def of MODELOS) {
      const yaExiste = await prisma.modelo.findFirst({
        where: {
          marca: "Yamaha",
          nombre: def.nombre,
          condicion: "0KM",
        },
        select: { id: true },
      })
      if (yaExiste) {
        salteados++
        console.log(`⏭  Yamaha ${def.nombre} — ya existe`)
        continue
      }

      maxNum++
      const codigo = `CAT0KM-${String(maxNum).padStart(4, "0")}`
      const slug = `yamaha-${def.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${codigo.toLowerCase()}`

      await prisma.modelo.create({
        data: {
          nombre: def.nombre,
          slug,
          codigo,
          marca: "Yamaha",
          categoriaVehiculo: "MOTOCICLETA",
          condicion: "0KM",
          anio: 2025,
          precio: null, // "Consultar"
          moneda: "ARS",
          aceptaPermuta: true,
          precioNegociable: true,
          descripcion: def.desc,
          notasInternas: `Segmento: ${def.segmento}`,
          specs: def.specs,
          fotos: [PLACEHOLDER],
          activo: false, // se activa al subir fotos
          tipoTenencia: "EN_LOCAL",
          origen: "STOCK_PROPIO",
          activeForMarketing: true,
        },
      })
      creados++
      console.log(`✅ Yamaha ${def.nombre} (${codigo}) — ${Object.keys(def.specs).length} specs`)
    }

    console.log(`\nCreados: ${creados} · Salteados: ${salteados}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})

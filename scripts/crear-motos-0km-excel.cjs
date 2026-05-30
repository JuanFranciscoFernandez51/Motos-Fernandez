#!/usr/bin/env node
/**
 * Crea las motos 0KM del Excel de precios en el catálogo (condicion=0KM).
 *
 * - SIN chasis/motor → NO entran a Stock motos (son catálogo publicitario).
 * - activo=false → no se publican hasta que tengan fotos (la sección /0km
 *   está oculta del menú igual).
 * - Precio + moneda del Excel. Las "s/d" quedan con precio null (Consultar).
 * - Categoría mapeada del segmento. Cilindrada inferida del nombre.
 * - Descripción básica autogenerada (segmento + marca). Las specs técnicas
 *   detalladas se completan después con IA (módulo specs-ia).
 *
 * Idempotente: si ya existe un modelo 0KM con misma marca+nombre, lo saltea.
 *
 * Uso: node scripts/crear-motos-0km-excel.cjs [--dry]
 *   --dry: solo muestra qué crearía, sin tocar la DB.
 */

require("dotenv").config({ path: ".env.local" })
const XLSX = require("xlsx")
const { PrismaClient } = require("@prisma/client")

const DRY = process.argv.includes("--dry")
const EXCEL = "/Users/juanfri/Downloads/Precios_Motos_AR_may2026.xlsx"

// Mapeo segmento → categoriaVehiculo del schema.
function categoriaDe(segmento) {
  const s = (segmento || "").toLowerCase()
  if (s.includes("atv") || s === "e-atv") return "CUATRICICLO"
  if (s.includes("utv")) return "UTV"
  if (s.includes("jet ski") || s.includes("moto de agua")) return "MOTO_DE_AGUA"
  return "MOTOCICLETA"
}

// Inferir cilindrada del nombre del modelo (primer número de 2-4 dígitos).
function cilindradaDe(modelo) {
  const m = String(modelo).match(/\b(\d{2,4})\b/)
  if (!m) return null
  const n = Number(m[1])
  // Filtrar años (1990-2030) que no son cilindrada. Cilindradas
  // razonables: 50-2500cc.
  if (n >= 1990 && n <= 2030) return null
  if (n >= 50 && n <= 2500) return `${n}cc`
  return null
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function descripcionDe(marca, modelo, segmento) {
  const seg = segmento ? ` del segmento ${segmento}` : ""
  return `${marca} ${modelo} 0KM${seg}. Unidad nueva con garantía oficial, entrega inmediata y financiación. Consultanos por colores disponibles y plan canje.`
}

async function main() {
  const wb = XLSX.readFile(EXCEL)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Precios"], { header: 1 })

  let marcaActual = ""
  const motos = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue
    if (r.length === 1 || (r[0] && !r[1])) {
      marcaActual = r[0]
      continue
    }
    const [marca, modelo, segmento, precio, moneda] = r
    if (!modelo) continue
    motos.push({
      marca: (marca || marcaActual || "").trim(),
      modelo: String(modelo).trim(),
      segmento: (segmento || "").trim(),
      precio: typeof precio === "number" ? Math.round(precio) : null,
      moneda: moneda === "USD" ? "USD" : moneda === "ARS" ? "ARS" : null,
    })
  }

  const prisma = new PrismaClient()
  let creadas = 0
  let salteadas = 0
  const codigoStartByMarca = {}

  try {
    // Para generar códigos únicos tipo "0KM-XXXX" secuenciales sin chocar
    // con generarCodigoModelo (que requiere transaction). Usamos un prefijo
    // propio para el catálogo publicitario.
    const ultimoCodigo = await prisma.modelo.findFirst({
      where: { codigo: { startsWith: "CAT0KM-" } },
      orderBy: { codigo: "desc" },
      select: { codigo: true },
    })
    let seq = ultimoCodigo
      ? Number(ultimoCodigo.codigo.replace("CAT0KM-", "")) || 0
      : 0

    for (const m of motos) {
      const nombre = m.modelo
      // Dedupe: ya existe 0KM con misma marca + nombre?
      const existe = await prisma.modelo.findFirst({
        where: {
          marca: { equals: m.marca, mode: "insensitive" },
          nombre: { equals: nombre, mode: "insensitive" },
          condicion: "0KM",
        },
        select: { id: true },
      })
      if (existe) {
        salteadas++
        continue
      }

      seq++
      const codigo = `CAT0KM-${String(seq).padStart(4, "0")}`
      const baseSlug = slugify(`${m.marca}-${nombre}-${codigo}`)
      const moneda = m.moneda || "ARS"

      if (DRY) {
        console.log(
          `+ ${m.marca} ${nombre} · ${categoriaDe(m.segmento)} · ${cilindradaDe(nombre) || "?"} · ${m.precio ? moneda + " " + m.precio : "s/d"}`
        )
        creadas++
        continue
      }

      await prisma.modelo.create({
        data: {
          nombre,
          slug: baseSlug,
          codigo,
          marca: m.marca,
          categoriaVehiculo: categoriaDe(m.segmento),
          condicion: "0KM",
          cilindrada: cilindradaDe(nombre),
          precio: m.precio,
          moneda,
          descripcion: descripcionDe(m.marca, nombre, m.segmento),
          // Catálogo publicitario: sin unidad física, no entra a Stock.
          activo: false, // se activa cuando tenga fotos
          origen: "STOCK_PROPIO",
          // Sin chasis/motor a propósito (es modelo genérico, no unidad).
          fotos: ["/images/logo-clasico.png"],
          // Etiqueta segmento en notasInternas para referencia del admin.
          notasInternas: m.segmento ? `Segmento: ${m.segmento}` : null,
        },
      })
      creadas++
    }

    console.log(
      `\n${DRY ? "[DRY] " : ""}Creadas: ${creadas} · Salteadas (ya existían): ${salteadas}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("❌", e)
  process.exit(1)
})

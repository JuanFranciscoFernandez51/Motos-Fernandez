/**
 * Lee un Excel con la lista de precios/stock y actualiza productos que YA
 * existen en la DB. NO crea productos nuevos — los que no matchean se
 * reportan al final para que los cargues a mano.
 *
 * Matching:
 *   1) Slug exacto (preferido)
 *   2) Nombre exacto case-insensitive (fallback)
 *
 * Columnas esperadas en la hoja "Productos":
 *   Categoría, Código, Nombre, Slug, Precio base (ARS), Precio oferta (ARS),
 *   Stock total, Activo, Destacado, Tiene talles, Stock XS..XXXL,
 *   Stock Unico, Moto compatible
 *
 * Uso:
 *   node scripts/actualizar-productos-desde-excel.cjs <path-al-excel>
 *   node scripts/actualizar-productos-desde-excel.cjs <path-al-excel> --apply
 *
 * Sin --apply corre en DRY-RUN y solo reporta los cambios que haria.
 */
const XLSX = require("xlsx")
const { PrismaClient } = require("@prisma/client")
const fs = require("fs")

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const EXCEL_PATH = args.find((a) => !a.startsWith("-"))

if (!EXCEL_PATH) {
  console.error("Uso: node scripts/actualizar-productos-desde-excel.cjs <path-al-excel> [--apply]")
  process.exit(1)
}
if (!fs.existsSync(EXCEL_PATH)) {
  console.error(`No existe el archivo: ${EXCEL_PATH}`)
  process.exit(1)
}

function parseSi(v) {
  if (v == null) return null
  const s = String(v).trim().toLowerCase()
  if (s === "sí" || s === "si" || s === "true" || s === "1" || s === "x") return true
  if (s === "no" || s === "false" || s === "0") return false
  return null
}

function parseInt0(v) {
  if (v == null || v === "") return null
  const n = parseInt(v)
  return Number.isFinite(n) ? n : null
}

function normalizar(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ")
}

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR cambios a DB" : "DRY-RUN (no toca DB)"}`)
  console.log("=".repeat(60))

  console.log(`Excel: ${EXCEL_PATH}`)
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets["Productos"]
  if (!ws) {
    console.error("No se encontró la hoja 'Productos' en el Excel")
    process.exit(1)
  }
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })
  console.log(`Filas en Excel: ${rows.length}`)

  // Pre-cargar todos los productos de la DB para matchear rápido
  const todos = await prisma.producto.findMany({
    select: {
      id: true,
      slug: true,
      nombre: true,
      precio: true,
      precioOferta: true,
      stock: true,
      stockPorTalle: true,
      activo: true,
      destacado: true,
      talles: true,
      codigo: true,
    },
  })
  const porSlug = new Map(todos.map((p) => [p.slug, p]))
  const porNombre = new Map(
    todos.map((p) => [normalizar(p.nombre), p])
  )
  console.log(`Productos en DB: ${todos.length}`)
  console.log("")

  const resultados = {
    matcheados: [],
    sinCambios: [],
    noEncontrados: [],
    errores: [],
  }

  for (const row of rows) {
    const slug = (row["Slug"] || "").trim()
    const nombre = (row["Nombre"] || "").trim()
    const precio = parseInt0(row["Precio base (ARS)"])
    const precioOferta = parseInt0(row["Precio oferta (ARS)"])
    const stockTotal = parseInt0(row["Stock total"]) ?? 0
    const activo = parseSi(row["Activo"])
    const destacado = parseSi(row["Destacado"])
    const tieneTalles = parseSi(row["Tiene talles"])
    const codigo = (row["Código"] || "").trim() || null
    const motoCompat = (row["Moto compatible"] || "").trim() || null

    if (!slug && !nombre) continue // fila vacía

    // Match
    let prod = porSlug.get(slug)
    let matchPor = "slug"
    if (!prod && nombre) {
      prod = porNombre.get(normalizar(nombre))
      matchPor = "nombre"
    }

    if (!prod) {
      resultados.noEncontrados.push({ slug, nombre })
      continue
    }

    // Armar stockPorTalle desde columnas individuales (solo si tiene talles)
    let stockPorTalle = null
    if (tieneTalles) {
      const tallesCols = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
      const stp = {}
      for (const t of tallesCols) {
        const v = parseInt0(row[`Stock ${t}`])
        if (v != null) stp[t] = v
      }
      const vUnico = parseInt0(row["Stock Unico"])
      if (vUnico != null && vUnico !== 0) stp["Único"] = vUnico
      if (Object.keys(stp).length > 0) stockPorTalle = stp
    }

    // Detectar qué cambia
    const cambios = {}
    if (precio != null && precio !== prod.precio) cambios.precio = { de: prod.precio, a: precio }
    if (precioOferta !== prod.precioOferta) {
      // null sale = quitamos la oferta
      cambios.precioOferta = { de: prod.precioOferta, a: precioOferta }
    }
    if (stockTotal !== prod.stock) cambios.stock = { de: prod.stock, a: stockTotal }
    if (activo != null && activo !== prod.activo) cambios.activo = { de: prod.activo, a: activo }
    if (destacado != null && destacado !== prod.destacado) {
      cambios.destacado = { de: prod.destacado, a: destacado }
    }
    if (codigo && codigo !== prod.codigo) cambios.codigo = { de: prod.codigo, a: codigo }
    if (motoCompat && motoCompat !== (prod.motoCompatible || "")) {
      cambios.motoCompatible = { de: prod.motoCompatible, a: motoCompat }
    }
    if (stockPorTalle) {
      const actual = JSON.stringify(prod.stockPorTalle || {})
      const nuevo = JSON.stringify(stockPorTalle)
      if (actual !== nuevo) {
        cambios.stockPorTalle = { de: prod.stockPorTalle, a: stockPorTalle }
      }
    }

    if (Object.keys(cambios).length === 0) {
      resultados.sinCambios.push({ slug: prod.slug, nombre: prod.nombre })
      continue
    }

    resultados.matcheados.push({
      id: prod.id,
      slug: prod.slug,
      nombre: prod.nombre,
      matchPor,
      cambios,
    })

    // Aplicar
    if (APPLY) {
      try {
        const data = {}
        if (cambios.precio) data.precio = cambios.precio.a
        if (cambios.precioOferta !== undefined) {
          // Si vino null en Excel → quitar oferta
          data.precioOferta = cambios.precioOferta?.a ?? null
        }
        if (cambios.stock) data.stock = cambios.stock.a
        if (cambios.activo) data.activo = cambios.activo.a
        if (cambios.destacado) data.destacado = cambios.destacado.a
        if (cambios.codigo) data.codigo = cambios.codigo.a
        if (cambios.motoCompatible) data.motoCompatible = cambios.motoCompatible.a
        if (cambios.stockPorTalle) data.stockPorTalle = cambios.stockPorTalle.a
        await prisma.producto.update({
          where: { id: prod.id },
          data,
        })
      } catch (e) {
        resultados.errores.push({
          slug: prod.slug,
          nombre: prod.nombre,
          error: e.message,
        })
      }
    }
  }

  // ==================== REPORTE ====================
  console.log("\n" + "=".repeat(60))
  console.log("REPORTE")
  console.log("=".repeat(60))
  console.log(`Productos con cambios: ${resultados.matcheados.length}`)
  console.log(`Productos sin cambios: ${resultados.sinCambios.length}`)
  console.log(`No encontrados en DB (skip): ${resultados.noEncontrados.length}`)
  console.log(`Errores al aplicar: ${resultados.errores.length}`)
  console.log("")

  if (resultados.matcheados.length > 0) {
    console.log("--- CAMBIOS DETECTADOS ---")
    for (const m of resultados.matcheados.slice(0, 50)) {
      console.log(`\n  ${m.nombre} (${m.slug}) [match: ${m.matchPor}]`)
      for (const [k, v] of Object.entries(m.cambios)) {
        let de = v.de
        let a = v.a
        if (typeof de === "object") de = JSON.stringify(de)
        if (typeof a === "object") a = JSON.stringify(a)
        console.log(`    ${k}: ${de} → ${a}`)
      }
    }
    if (resultados.matcheados.length > 50) {
      console.log(`\n  ... y ${resultados.matcheados.length - 50} más`)
    }
  }

  if (resultados.noEncontrados.length > 0) {
    console.log("\n--- NO ENCONTRADOS (no se crean, hay que cargarlos a mano) ---")
    for (const n of resultados.noEncontrados) {
      console.log(`  - ${n.nombre || "(sin nombre)"} (slug: ${n.slug || "—"})`)
    }
  }

  if (resultados.errores.length > 0) {
    console.log("\n--- ERRORES ---")
    for (const e of resultados.errores) {
      console.log(`  ✗ ${e.nombre}: ${e.error}`)
    }
  }

  if (!APPLY) {
    console.log("\n" + "=".repeat(60))
    console.log("DRY-RUN. Para aplicar los cambios:")
    console.log(`  node scripts/actualizar-productos-desde-excel.cjs "${EXCEL_PATH}" --apply`)
    console.log("=".repeat(60))
  } else {
    console.log("\n✓ Cambios aplicados.")
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})

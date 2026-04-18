/**
 * Script para copiar productos y modelos de Vespa Bahia a Motos Fernandez.
 * Solo INSERTA datos nuevos, no modifica ni borra nada existente.
 * Si un slug ya existe, lo saltea.
 */

import pg from "pg"
const { Client } = pg

const VESPA_URL = "postgresql://neondb_owner:npg_IWFlag3D4Ufk@ep-rapid-lake-acrjatjx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
const MF_URL = "postgresql://neondb_owner:npg_ckjx36JAgrbs@ep-little-fire-ac85bgs4-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

async function main() {
  const vespa = new Client({ connectionString: VESPA_URL })
  const mf = new Client({ connectionString: MF_URL })

  await vespa.connect()
  await mf.connect()

  console.log("✅ Conectado a ambas bases de datos\n")

  // ==== CATEGORÍAS ====
  console.log("📂 Copiando categorías...")
  const { rows: vespaCategorias } = await vespa.query(
    `SELECT id, nombre, slug, orden FROM "Categoria" ORDER BY orden`
  )
  const { rows: mfCategorias } = await mf.query(
    `SELECT id, slug FROM "Categoria"`
  )
  const mfCategoriaSlugs = new Set(mfCategorias.map(c => c.slug))
  const categoriaIdMap = new Map()

  // Mapear existentes
  for (const cat of vespaCategorias) {
    const existente = mfCategorias.find(c => c.slug === cat.slug)
    if (existente) {
      categoriaIdMap.set(cat.id, existente.id)
    }
  }

  let categoriasCopiadas = 0
  for (const cat of vespaCategorias) {
    if (mfCategoriaSlugs.has(cat.slug)) {
      console.log(`  ⏭️  "${cat.nombre}" ya existe`)
      continue
    }

    const { rows } = await mf.query(
      `INSERT INTO "Categoria" (id, nombre, slug, orden) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
      [cat.nombre, cat.slug, cat.orden]
    )
    categoriaIdMap.set(cat.id, rows[0].id)
    console.log(`  ✅ "${cat.nombre}" creada`)
    categoriasCopiadas++
  }

  // ==== PRODUCTOS ====
  console.log("\n🛍️  Copiando productos...")
  const { rows: vespaProductos } = await vespa.query(
    `SELECT * FROM "Producto" WHERE activo = true ORDER BY nombre`
  )
  const { rows: mfProductos } = await mf.query(
    `SELECT slug FROM "Producto"`
  )
  const mfProductoSlugs = new Set(mfProductos.map(p => p.slug))

  let productosCopiados = 0
  let productosSalteados = 0

  for (const prod of vespaProductos) {
    if (mfProductoSlugs.has(prod.slug)) {
      productosSalteados++
      continue
    }

    const nuevaCategoriaId = categoriaIdMap.get(prod.categoriaId)
    if (!nuevaCategoriaId) {
      console.log(`  ⚠️  Sin categoría para "${prod.nombre}", salteando`)
      continue
    }

    await mf.query(
      `INSERT INTO "Producto" (id, codigo, nombre, slug, precio, "precioOferta", descripcion, fotos, stock, talles, "stockPorTalle", "motoCompatible", activo, destacado, "categoriaId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        prod.codigo,
        prod.nombre,
        prod.slug,
        prod.precio,
        prod.precioOferta,
        prod.descripcion,
        prod.fotos,
        prod.stock,
        prod.talles,
        prod.stockPorTalle ? JSON.stringify(prod.stockPorTalle) : null,
        prod.motoCompatible,
        prod.activo,
        prod.destacado,
        nuevaCategoriaId,
      ]
    )
    productosCopiados++
    console.log(`  ✅ "${prod.nombre}" - $${prod.precio.toLocaleString()}`)
  }
  console.log(`\n  Productos copiados: ${productosCopiados}`)
  console.log(`  Productos salteados: ${productosSalteados}`)

  // ==== MODELOS ====
  console.log("\n🏍️  Copiando modelos...")
  const { rows: vespaModelos } = await vespa.query(
    `SELECT * FROM "Modelo" WHERE activo = true ORDER BY orden`
  )
  const { rows: mfModelos } = await mf.query(
    `SELECT slug FROM "Modelo"`
  )
  const mfModeloSlugs = new Set(mfModelos.map(m => m.slug))

  const marcaMap = { VESPA: "Vespa", PIAGGIO: "Piaggio", APRILIA: "Aprilia" }

  let modelosCopiados = 0
  let modelosSalteados = 0

  for (const modelo of vespaModelos) {
    if (mfModeloSlugs.has(modelo.slug)) {
      modelosSalteados++
      console.log(`  ⏭️  "${modelo.nombre}" ya existe`)
      continue
    }

    const marca = marcaMap[modelo.marca] || modelo.marca

    const { rows } = await mf.query(
      `INSERT INTO "Modelo" (id, nombre, slug, marca, "categoriaVehiculo", cilindrada, precio, descripcion, specs, financiacion, fotos, activo, destacado, orden, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) RETURNING id`,
      [
        modelo.nombre,
        modelo.slug,
        marca,
        "MOTOCICLETA", // Vespa/Piaggio/Aprilia son motos/scooters
        null, // cilindrada - se puede agregar después
        modelo.precio,
        modelo.descripcion,
        modelo.specs ? JSON.stringify(modelo.specs) : null,
        modelo.financiacion ? JSON.stringify(modelo.financiacion) : null,
        modelo.fotos,
        modelo.activo,
        modelo.destacado,
        modelo.orden,
      ]
    )

    const nuevoModeloId = rows[0].id

    // Copiar colores
    const { rows: colores } = await vespa.query(
      `SELECT nombre, hex, foto FROM "ModeloColor" WHERE "modeloId" = $1`,
      [modelo.id]
    )

    for (const color of colores) {
      await mf.query(
        `INSERT INTO "ModeloColor" (id, nombre, hex, foto, "modeloId") VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
        [color.nombre, color.hex, color.foto, nuevoModeloId]
      )
    }

    modelosCopiados++
    console.log(`  ✅ "${modelo.nombre}" (${marca}) - ${colores.length} colores`)
  }
  console.log(`\n  Modelos copiados: ${modelosCopiados}`)
  console.log(`  Modelos salteados: ${modelosSalteados}`)

  // ==== RESUMEN ====
  console.log("\n" + "=".repeat(50))
  console.log("📊 RESUMEN DE MIGRACIÓN")
  console.log("=".repeat(50))
  console.log(`Categorías copiadas: ${categoriasCopiadas}`)
  console.log(`Productos copiados: ${productosCopiados}`)
  console.log(`Modelos copiados: ${modelosCopiados}`)
  console.log("=".repeat(50))
  console.log("✅ Migración completada!")

  await vespa.end()
  await mf.end()
}

main().catch((e) => {
  console.error("❌ Error:", e)
  process.exit(1)
})

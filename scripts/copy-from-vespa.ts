/**
 * Script para copiar productos y modelos de Vespa Bahia a Motos Fernandez.
 * Solo INSERTA datos nuevos, no modifica ni borra nada existente.
 * Si un slug ya existe, lo saltea.
 */

import { PrismaClient as PrismaClientVespa } from "@prisma/client"
import { PrismaClient as PrismaClientMF } from "@prisma/client"

// DB de Vespa (origen)
const vespaDb = new PrismaClientMF({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_IWFlag3D4Ufk@ep-rapid-lake-acrjatjx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    },
  },
})

// DB de Motos Fernandez (destino)
const mfDb = new PrismaClientMF({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_ckjx36JAgrbs@ep-little-fire-ac85bgs4-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    },
  },
})

async function main() {
  console.log("🔍 Leyendo datos de Vespa Bahia...\n")

  // 1. Leer categorías de Vespa
  const vespaCategorias = await vespaDb.categoria.findMany({
    include: { productos: { where: { activo: true } } },
  })
  console.log(`📦 Categorías encontradas en Vespa: ${vespaCategorias.length}`)

  // 2. Leer modelos de Vespa
  const vespaModelos = await vespaDb.modelo.findMany({
    where: { activo: true },
    include: { colores: true },
  })
  console.log(`🏍️  Modelos encontrados en Vespa: ${vespaModelos.length}`)

  // 3. Leer categorías existentes en MF para no duplicar
  const mfCategoriasExistentes = await mfDb.categoria.findMany()
  const mfCategoriaSlugs = new Set(mfCategoriasExistentes.map((c) => c.slug))

  // 4. Leer modelos existentes en MF para no duplicar
  const mfModelosExistentes = await mfDb.modelo.findMany()
  const mfModeloSlugs = new Set(mfModelosExistentes.map((m) => m.slug))

  // 5. Leer productos existentes en MF para no duplicar
  const mfProductosExistentes = await mfDb.producto.findMany()
  const mfProductoSlugs = new Set(mfProductosExistentes.map((p) => p.slug))

  // Mapa de categoría vieja ID -> nueva ID
  const categoriaIdMap = new Map<string, string>()

  // ==== COPIAR CATEGORÍAS ====
  console.log("\n📂 Copiando categorías...")
  for (const cat of vespaCategorias) {
    if (mfCategoriaSlugs.has(cat.slug)) {
      // Ya existe, mapear al existente
      const existente = mfCategoriasExistentes.find((c) => c.slug === cat.slug)
      if (existente) categoriaIdMap.set(cat.id, existente.id)
      console.log(`  ⏭️  Categoría "${cat.nombre}" ya existe, salteando`)
      continue
    }

    const nueva = await mfDb.categoria.create({
      data: {
        nombre: cat.nombre,
        slug: cat.slug,
        orden: cat.orden,
      },
    })
    categoriaIdMap.set(cat.id, nueva.id)
    console.log(`  ✅ Categoría creada: "${cat.nombre}"`)
  }

  // ==== COPIAR PRODUCTOS ====
  console.log("\n🛍️  Copiando productos...")
  let productosCopiados = 0
  let productosSalteados = 0

  for (const cat of vespaCategorias) {
    for (const prod of cat.productos) {
      if (mfProductoSlugs.has(prod.slug)) {
        productosSalteados++
        continue
      }

      const nuevaCategoriaId = categoriaIdMap.get(cat.id)
      if (!nuevaCategoriaId) {
        console.log(`  ⚠️  No se encontró categoría para "${prod.nombre}", salteando`)
        continue
      }

      await mfDb.producto.create({
        data: {
          codigo: prod.codigo,
          nombre: prod.nombre,
          slug: prod.slug,
          precio: prod.precio,
          precioOferta: prod.precioOferta,
          descripcion: prod.descripcion,
          fotos: prod.fotos,
          stock: prod.stock,
          talles: prod.talles,
          stockPorTalle: prod.stockPorTalle ?? undefined,
          motoCompatible: prod.motoCompatible,
          activo: prod.activo,
          destacado: prod.destacado,
          categoriaId: nuevaCategoriaId,
        },
      })
      productosCopiados++
    }
  }
  console.log(`  ✅ Productos copiados: ${productosCopiados}`)
  console.log(`  ⏭️  Productos salteados (ya existían): ${productosSalteados}`)

  // ==== COPIAR MODELOS ====
  console.log("\n🏍️  Copiando modelos...")
  let modelosCopiados = 0
  let modelosSalteados = 0

  // Mapeo de marcas Vespa enum -> string para MF
  const marcaMap: Record<string, string> = {
    VESPA: "Vespa",
    PIAGGIO: "Piaggio",
    APRILIA: "Aprilia",
  }

  for (const modelo of vespaModelos) {
    if (mfModeloSlugs.has(modelo.slug)) {
      modelosSalteados++
      console.log(`  ⏭️  Modelo "${modelo.nombre}" ya existe, salteando`)
      continue
    }

    const nuevoModelo = await mfDb.modelo.create({
      data: {
        nombre: modelo.nombre,
        slug: modelo.slug,
        marca: marcaMap[modelo.marca as string] || modelo.marca as string,
        categoriaVehiculo: "MOTOCICLETA", // Vespa/Piaggio/Aprilia son todas motos
        precio: modelo.precio,
        descripcion: modelo.descripcion,
        specs: modelo.specs ?? undefined,
        financiacion: modelo.financiacion ?? undefined,
        fotos: modelo.fotos,
        activo: modelo.activo,
        destacado: modelo.destacado,
        orden: modelo.orden,
      },
    })

    // Copiar colores del modelo
    for (const color of modelo.colores) {
      await mfDb.modeloColor.create({
        data: {
          nombre: color.nombre,
          hex: color.hex,
          foto: color.foto,
          modeloId: nuevoModelo.id,
        },
      })
    }

    modelosCopiados++
    console.log(`  ✅ Modelo copiado: "${modelo.nombre}" (${modelo.colores.length} colores)`)
  }
  console.log(`  ✅ Modelos copiados: ${modelosCopiados}`)
  console.log(`  ⏭️  Modelos salteados (ya existían): ${modelosSalteados}`)

  // ==== RESUMEN ====
  console.log("\n" + "=".repeat(50))
  console.log("📊 RESUMEN DE MIGRACIÓN")
  console.log("=".repeat(50))
  console.log(`Categorías copiadas: ${vespaCategorias.length - [...categoriaIdMap.values()].filter((v, i, a) => mfCategoriasExistentes.some(c => c.id === v)).length}`)
  console.log(`Productos copiados: ${productosCopiados}`)
  console.log(`Modelos copiados: ${modelosCopiados}`)
  console.log("=".repeat(50))
  console.log("✅ Migración completada sin errores!")
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración:", e)
    process.exit(1)
  })
  .finally(async () => {
    await vespaDb.$disconnect()
    await mfDb.$disconnect()
  })

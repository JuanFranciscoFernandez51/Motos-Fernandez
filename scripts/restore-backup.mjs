// Restaura un backup JSON descargado de Cloudinary.
//
// USO:
//   node scripts/restore-backup.mjs path/al/backup.json
//
// IMPORTANTE: este script NO borra la DB existente. Hace upserts por id.
// - Si el id existe -> update.
// - Si no existe -> create.
// Para restaurar desde cero, primero hay que limpiar la DB manualmente
// o pasarle --wipe (peligroso).

import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import { config } from "dotenv"
config({ path: ".env.local" })

const prisma = new PrismaClient()

async function restoreTable(modelName, items) {
  if (!items || items.length === 0) return { count: 0 }
  const model = prisma[modelName]
  if (!model) {
    console.warn(`  ⚠️ Modelo ${modelName} no existe en este Prisma Client, saltando`)
    return { count: 0 }
  }
  let created = 0
  let updated = 0
  for (const item of items) {
    try {
      // Quitar campos que no se pueden upsertar (timestamps automáticos los regeneramos? mejor preservarlos)
      const { id, ...rest } = item
      await model.upsert({
        where: { id },
        update: rest,
        create: item,
      })
      updated++
    } catch {
      try {
        await model.create({ data: item })
        created++
      } catch (e2) {
        console.error(`  ❌ Error en ${modelName}/${item.id}:`, e2.message)
      }
    }
  }
  return { created, updated }
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error("Uso: node scripts/restore-backup.mjs path/al/backup.json")
    process.exit(1)
  }
  const dump = JSON.parse(fs.readFileSync(file, "utf8"))

  console.log(`📦 Restore desde ${file}`)
  console.log(`   Backup creado: ${dump._meta?.createdAt}`)
  console.log(`   Counts: ${JSON.stringify(dump._meta?.counts)}`)
  console.log()

  // ORDEN IMPORTANTE: padres antes que hijos por las foreign keys
  const orden = [
    ["proveedor", dump.proveedores],
    ["cliente", dump.clientes],
    ["modelo", dump.modelos],
    ["modeloColor", dump.modeloColores],
    ["tipoServicio", dump.tiposServicio],
    ["mandatoVenta", dump.mandatos],
    ["ordenCompra", dump.ordenesCompra],
    ["oCPermuta", dump.ocPermutas],
    ["financiacionOC", dump.financiaciones],
    ["cuotaFinanciacion", dump.cuotas],
    ["ordenTrabajo", dump.ordenesTrabajo],
    ["noticia", dump.noticias],
    ["testimonio", dump.testimonios],
    ["producto", dump.productos],
    ["cupon", dump.cupones],
    ["turno", dump.turnos],
    ["lead", dump.leads],
    ["pedido", dump.pedidos],
  ]

  for (const [name, items] of orden) {
    process.stdout.write(`Restaurando ${name}... `)
    const r = await restoreTable(name, items || [])
    console.log(`creados=${r.created || 0}, actualizados=${r.updated || 0}`)
  }

  console.log("\n✅ Restore completado.")
}

main()
  .catch((e) => {
    console.error("FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

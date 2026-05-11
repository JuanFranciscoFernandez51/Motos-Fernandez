// Asigna codigos operativos a las motos existentes que todavia no tienen.
//
//   - 0KM padres (sin modeloOrigenId): MF-0KM-0001, -0002, ...
//   - USADAS / permutas / clones (con modeloOrigenId): MF-0001, MF-0002, ...
//
// USO:
//   node scripts/backfill-codigo-modelos.mjs --dry-run
//   node scripts/backfill-codigo-modelos.mjs
//
// Idempotente: las motos que ya tienen codigo se saltean.
import { PrismaClient } from "@prisma/client"
import { config } from "dotenv"
config({ path: ".env.local", override: true })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")

function pad(n) {
  return String(n).padStart(4, "0")
}

async function main() {
  console.log(
    `🔢 Asignando códigos a modelos existentes${DRY_RUN ? " [DRY-RUN]" : ""}\n`
  )

  // Traemos TODAS las motos ordenadas por createdAt para que las primeras
  // creadas obtengan los códigos más bajos.
  const motos = await prisma.modelo.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      marca: true,
      nombre: true,
      condicion: true,
      modeloOrigenId: true,
      codigo: true,
    },
  })

  console.log(`Total motos en DB: ${motos.length}\n`)

  // Separar las que ya tienen codigo (para no pisarlas) vs las que no.
  const conCodigo = motos.filter((m) => m.codigo)
  const sinCodigo = motos.filter((m) => !m.codigo)
  console.log(`Ya tienen codigo:    ${conCodigo.length}`)
  console.log(`Sin codigo (procesamos): ${sinCodigo.length}\n`)

  // Inicializar contadores con el max actual de cada serie.
  let next0KM = 1
  let nextUsada = 1
  for (const m of conCodigo) {
    const m0km = m.codigo.match(/^MF-0KM-(\d+)$/)
    if (m0km) next0KM = Math.max(next0KM, parseInt(m0km[1], 10) + 1)
    const mUs = m.codigo.match(/^MF-(\d+)$/)
    if (mUs) nextUsada = Math.max(nextUsada, parseInt(mUs[1], 10) + 1)
  }
  console.log(`Próximo MF-0KM-: ${pad(next0KM)}`)
  console.log(`Próximo MF-:     ${pad(nextUsada)}\n`)

  let asignados = 0
  let errores = 0

  for (const m of sinCodigo) {
    const label = `${m.marca} ${m.nombre}`
    // Decidir tipo
    const es0KMPadre = m.condicion === "0KM" && !m.modeloOrigenId
    let codigo
    if (es0KMPadre) {
      codigo = `MF-0KM-${pad(next0KM)}`
      next0KM++
    } else {
      codigo = `MF-${pad(nextUsada)}`
      nextUsada++
    }

    if (DRY_RUN) {
      console.log(`  📝 ${label} (${m.slug}) → ${codigo}`)
      asignados++
      continue
    }

    try {
      await prisma.modelo.update({
        where: { id: m.id },
        data: { codigo },
      })
      console.log(`  ✅ ${label} (${m.slug}) → ${codigo}`)
      asignados++
    } catch (e) {
      errores++
      console.log(
        `  ❌ ${label}: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`
      )
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`Asignados: ${asignados}`)
  console.log(`Errores:   ${errores}`)
  if (DRY_RUN) {
    console.log(
      "\n⚠️  Estaba en --dry-run. Si te convence, corré sin --dry-run."
    )
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

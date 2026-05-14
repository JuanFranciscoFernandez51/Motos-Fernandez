/**
 * Re-linkea Mandato.modeloId con los Modelos que fueron publicados desde
 * ese mandato. Hay casos historicos donde se creo el Modelo desde un
 * mandato (slug tipo "marca-modelo-mvN") pero la relacion inversa
 * mandato.modeloId quedo en null. Ademas aprovecha para:
 *  - setear modelo.origen = "MANDATO"
 *  - setear modelo.clienteEntregaId = mandato.clienteId
 *
 * El matching se hace por slug que contiene "-mvN" donde N = mandato.numero.
 *
 * Idempotente. Uso:
 *   node scripts/relinkear-mandatos-modelos.cjs          # dry-run
 *   node scripts/relinkear-mandatos-modelos.cjs --apply
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR" : "DRY-RUN"}\n`)

  // Mandatos sin modelo linkeado
  const mandatosHuerfanos = await prisma.mandatoVenta.findMany({
    where: { modeloId: null },
    select: {
      id: true,
      numero: true,
      marca: true,
      modelo: true,
      clienteId: true,
      cliente: { select: { apellido: true, nombre: true } },
    },
  })

  console.log(`Mandatos con modeloId=null: ${mandatosHuerfanos.length}`)

  const acciones = []
  for (const mv of mandatosHuerfanos) {
    const sufijo = `-mv${mv.numero}`
    const candidatos = await prisma.modelo.findMany({
      where: { slug: { endsWith: sufijo } },
      select: {
        id: true,
        slug: true,
        marca: true,
        nombre: true,
        origen: true,
        clienteEntregaId: true,
      },
    })

    if (candidatos.length === 0) {
      console.log(`  MV-${String(mv.numero).padStart(4, "0")} ${mv.marca} ${mv.modelo} — ningún modelo encontrado con sufijo ${sufijo}`)
      continue
    }
    if (candidatos.length > 1) {
      console.log(`  MV-${String(mv.numero).padStart(4, "0")} ${mv.marca} ${mv.modelo} — ⚠ múltiples candidatos: ${candidatos.map((c) => c.slug).join(", ")}`)
      continue
    }
    const m = candidatos[0]
    const cambios = {
      mandato: { modeloId: m.id },
      modelo: {},
    }
    if (m.origen !== "MANDATO") cambios.modelo.origen = "MANDATO"
    if (m.clienteEntregaId !== mv.clienteId) {
      cambios.modelo.clienteEntregaId = mv.clienteId
    }
    acciones.push({ mv, m, cambios })
    console.log(
      `  MV-${String(mv.numero).padStart(4, "0")} ${mv.marca} ${mv.modelo} ↔ ${m.slug} (${m.marca} ${m.nombre})`
    )
    if (Object.keys(cambios.modelo).length > 0) {
      console.log(`    + Modelo: ${JSON.stringify(cambios.modelo)}`)
    }
  }

  if (APPLY && acciones.length > 0) {
    for (const a of acciones) {
      await prisma.$transaction(async (tx) => {
        await tx.mandatoVenta.update({
          where: { id: a.mv.id },
          data: { modeloId: a.m.id },
        })
        if (Object.keys(a.cambios.modelo).length > 0) {
          await tx.modelo.update({
            where: { id: a.m.id },
            data: a.cambios.modelo,
          })
        }
      })
    }
    console.log(`\n✓ ${acciones.length} mandatos re-linkeados.`)
  } else if (!APPLY) {
    console.log(`\nDRY-RUN. Para aplicar:`)
    console.log(`  node scripts/relinkear-mandatos-modelos.cjs --apply`)
  }

  await prisma.$disconnect()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})

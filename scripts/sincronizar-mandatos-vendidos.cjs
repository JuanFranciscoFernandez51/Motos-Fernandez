/**
 * Sincronizador: para cada Mandato en estado VENDIDO, se asegura de que
 * el Modelo asociado esté marcado como vendida=true + activo=false +
 * fechaVenta + etiqueta=null. Tambien pausa ML si esta active.
 *
 * Detecta el bug de Mochen: mandato VENDIDO pero modelo aún en stock.
 *
 * Idempotente. Uso:
 *   node scripts/sincronizar-mandatos-vendidos.cjs          # dry-run
 *   node scripts/sincronizar-mandatos-vendidos.cjs --apply
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR" : "DRY-RUN"}\n`)
  const vendidos = await prisma.mandatoVenta.findMany({
    where: { estado: "VENDIDO" },
    select: {
      id: true,
      numero: true,
      modeloId: true,
      ordenCompraId: true,
      marca: true,
      modelo: true,
      cliente: { select: { apellido: true, nombre: true } },
      modelo_: {
        select: {
          id: true,
          vendida: true,
          activo: true,
          etiqueta: true,
          fechaVenta: true,
          mlListingId: true,
          mlEstado: true,
          slug: true,
        },
      },
    },
  })

  console.log(`Mandatos VENDIDOS: ${vendidos.length}`)

  const desincronizados = []
  for (const mv of vendidos) {
    if (!mv.modelo_) {
      console.log(`  MV-${String(mv.numero).padStart(4, "0")} | ${mv.cliente.apellido} | sin modelo asociado, salto`)
      continue
    }
    const m = mv.modelo_
    const cambios = {}
    if (!m.vendida) cambios.vendida = true
    if (m.activo) cambios.activo = false
    if (m.etiqueta) cambios.etiqueta = null
    if (!m.fechaVenta) cambios.fechaVenta = new Date()
    if (m.mlListingId && m.mlEstado === "active") cambios.mlEstado = "paused"

    if (Object.keys(cambios).length === 0) {
      continue // ya sincronizado
    }
    desincronizados.push({
      mvNumero: mv.numero,
      cliente: `${mv.cliente.apellido}, ${mv.cliente.nombre}`,
      moto: `${mv.marca} ${mv.modelo}`,
      slug: m.slug,
      cambios,
    })
  }

  console.log(`Desincronizados: ${desincronizados.length}\n`)
  for (const d of desincronizados) {
    console.log(`  MV-${String(d.mvNumero).padStart(4, "0")} | ${d.cliente} | ${d.moto} (${d.slug})`)
    for (const [k, v] of Object.entries(d.cambios)) {
      console.log(`    ${k}: → ${v instanceof Date ? v.toISOString() : v}`)
    }
  }

  if (APPLY && desincronizados.length > 0) {
    for (const d of desincronizados) {
      const mv = vendidos.find((x) => x.numero === d.mvNumero)
      await prisma.modelo.update({
        where: { id: mv.modelo_.id },
        data: d.cambios,
      })
    }
    console.log(`\n✓ ${desincronizados.length} modelos sincronizados.`)
  } else if (!APPLY) {
    console.log(`\nDRY-RUN. Para aplicar: node scripts/sincronizar-mandatos-vendidos.cjs --apply`)
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })

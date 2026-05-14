const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function siguienteCodigo(prefix) {
  const all = await prisma.modelo.findMany({
    where: { codigo: { startsWith: prefix } },
    select: { codigo: true },
  })
  const nums = all
    .map((m) => {
      const match = (m.codigo || "").match(new RegExp(`^${prefix}(\\d+)$`))
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)
  return (nums.length > 0 ? Math.max(...nums) : 0) + 1
}

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR" : "DRY-RUN"}`)

  const sinCodigo = await prisma.modelo.findMany({
    where: { codigo: null },
    select: {
      id: true,
      slug: true,
      marca: true,
      nombre: true,
      condicion: true,
      origen: true,
      mandato: { select: { numero: true, clienteId: true } },
      clienteEntrega: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`\nModelos sin codigo: ${sinCodigo.length}`)
  if (sinCodigo.length === 0) {
    console.log("No hay nada que reparar.")
    await prisma.$disconnect()
    return
  }

  // Seguir generando incrementalmente — pedimos el "proximo" antes y vamos sumando
  let proximoUsada = await siguienteCodigo("MF-")
  let proximoCero = await siguienteCodigo("MF-0KM-")

  for (const m of sinCodigo) {
    const is0KM = m.condicion === "0KM"
    const prefix = is0KM ? "MF-0KM-" : "MF-"
    const numero = is0KM ? proximoCero : proximoUsada
    if (is0KM) proximoCero++
    else proximoUsada++
    const codigo = `${prefix}${String(numero).padStart(4, "0")}`

    // Si vino de mandato y todavia no tiene origen MANDATO + clienteEntrega, lo seteamos
    const updateData = { codigo }
    if (m.mandato && (m.origen !== "MANDATO" || !m.clienteEntrega)) {
      updateData.origen = "MANDATO"
      updateData.clienteEntregaId = m.mandato.clienteId
    }

    console.log(`  ${m.slug} | ${m.marca} ${m.nombre} | ${m.condicion} → ${codigo}${updateData.origen ? " + origen MANDATO + clienteEntrega" : ""}`)
    if (APPLY) {
      await prisma.modelo.update({ where: { id: m.id }, data: updateData })
    }
  }

  if (!APPLY) {
    console.log("\nDRY-RUN. Para aplicar: node repair-codigos.cjs --apply")
  } else {
    console.log(`\n✓ ${sinCodigo.length} modelos reparados.`)
  }
  await prisma.$disconnect()
}
main().catch((e)=>{console.error(e);process.exit(1)})

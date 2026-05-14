/**
 * Crea mandatos de venta para todas las motos USADAS activas (no vendidas)
 * que aun no tienen mandato. Sirve para tener un registro completo de la
 * flota usada del local — Francisco después edita cada uno asignando el
 * cliente real, precio mínimo, comisión, etc.
 *
 * Logica:
 *  - Si la moto tiene `clienteEntrega` → mandato con ese cliente
 *  - Si no → mandato con cliente placeholder "POR COMPLETAR, Cliente"
 *    (se crea automaticamente la primera vez)
 *
 * Los mandatos se crean en estado PENDIENTE (no ACTIVO) para que sea
 * facil filtrarlos y completarlos. Incluyen las observaciones marcando
 * que son auto-generados.
 *
 * Idempotente. Uso:
 *   node scripts/crear-mandatos-faltantes.cjs           # dry-run
 *   node scripts/crear-mandatos-faltantes.cjs --apply
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function getOrCreatePlaceholder() {
  let cliente = await prisma.cliente.findFirst({
    where: { apellido: "POR COMPLETAR", nombre: "Cliente" },
  })
  if (cliente) return cliente
  if (!APPLY) {
    return {
      id: "__placeholder__",
      apellido: "POR COMPLETAR",
      nombre: "Cliente",
    }
  }
  cliente = await prisma.cliente.create({
    data: {
      apellido: "POR COMPLETAR",
      nombre: "Cliente",
      notasInternas:
        "Cliente placeholder para mandatos auto-generados de stock historico. " +
        "Reemplazar editando el mandato y asignando el dueño real.",
    },
  })
  return cliente
}

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR" : "DRY-RUN"}\n`)

  const usadas = await prisma.modelo.findMany({
    where: {
      condicion: "USADA",
      vendida: false,
      mandato: { is: null },
    },
    select: {
      id: true,
      slug: true,
      marca: true,
      nombre: true,
      anio: true,
      kilometros: true,
      cilindrada: true,
      color: true,
      chasis: true,
      motor: true,
      patente: true,
      precio: true,
      moneda: true,
      fotos: true,
      origen: true,
      clienteEntregaId: true,
      clienteEntrega: { select: { apellido: true, nombre: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Motos USADAS activas sin mandato: ${usadas.length}`)

  const placeholder = await getOrCreatePlaceholder()
  console.log(`Cliente placeholder: ${placeholder.apellido}, ${placeholder.nombre} (${placeholder.id})\n`)

  const detalles = []
  for (const m of usadas) {
    const usarCliente = m.clienteEntregaId
      ? { id: m.clienteEntregaId, nombre: `${m.clienteEntrega.apellido}, ${m.clienteEntrega.nombre}` }
      : { id: placeholder.id, nombre: `${placeholder.apellido}, ${placeholder.nombre} (placeholder)` }

    detalles.push({
      modeloId: m.id,
      slug: m.slug,
      moto: `${m.marca} ${m.nombre}`,
      cliente: usarCliente.nombre,
      clienteId: usarCliente.id,
      precio: m.precio,
      moneda: m.moneda,
    })

    if (APPLY) {
      // Skip si el clienteId es el placeholder fake (dry-run sin --apply)
      if (usarCliente.id === "__placeholder__") continue
      await prisma.mandatoVenta.create({
        data: {
          clienteId: usarCliente.id,
          marca: m.marca,
          modelo: m.nombre,
          anio: m.anio,
          kilometros: m.kilometros,
          cilindrada: m.cilindrada,
          color: m.color,
          chasis: m.chasis,
          motor: m.motor,
          patente: m.patente,
          precioVenta: m.precio ?? 0,
          // precioMinimo queda null para que Francisco lo complete
          moneda: m.moneda || "ARS",
          estado: "PENDIENTE", // hay que completarlo antes de activar
          fotos: m.fotos || [],
          modeloId: m.id,
          observaciones:
            "Mandato generado automaticamente desde stock de usadas. " +
            "Completar: cliente real, precio minimo, comision, documentacion.",
        },
      })
    }
  }

  console.log("--- A CREAR ---")
  for (const d of detalles) {
    console.log(`  ${d.slug.padEnd(35)} | ${d.moto.padEnd(40)} | ${d.cliente}`)
  }

  if (APPLY) {
    console.log(`\n✓ ${detalles.length} mandatos creados (estado PENDIENTE).`)
  } else {
    console.log(`\nDRY-RUN. Para aplicar: node scripts/crear-mandatos-faltantes.cjs --apply`)
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })

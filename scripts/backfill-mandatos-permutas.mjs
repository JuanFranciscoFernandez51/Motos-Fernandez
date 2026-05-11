// Backfill: genera MandatoVenta retroactivamente para las OCPermutas
// que NO tienen mandato asociado todavía.
//
// USO:
//   node scripts/backfill-mandatos-permutas.mjs --dry-run     # solo simular
//   node scripts/backfill-mandatos-permutas.mjs               # crear de verdad
//
// Idempotente: si una permuta ya tiene mandato (porque su Modelo del
// stock ya está linkeado a un MandatoVenta), se saltea.
//
// Criterio: solo procesamos permutas que tengan marca + modelo + valor
// > 0 + motoRecibidaId (= moto que se cargó al stock). Las que no
// tienen motoRecibidaId quedan registradas pero no se les crea mandato
// porque no hay Modelo al que linkear.
import { PrismaClient } from "@prisma/client"
import { config } from "dotenv"
config({ path: ".env.local", override: true })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  console.log(
    `🔁 Backfill de mandatos desde permutas existentes${DRY_RUN ? " [DRY-RUN]" : ""}`
  )
  console.log("")

  // Traer todas las permutas con info de la moto que se creó (si tiene)
  // y la OC asociada (cliente, fecha, moneda).
  const permutas = await prisma.oCPermuta.findMany({
    include: {
      ordenCompra: { select: { id: true, clienteId: true, fecha: true, moneda: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Total de permutas en DB: ${permutas.length}\n`)

  let creados = 0
  let saltadasYaExiste = 0
  let saltadasSinMoto = 0
  let saltadasSinDatos = 0
  let errores = 0

  for (const p of permutas) {
    const labelMoto = `${p.marca || "?"} ${p.modelo || "?"}${p.anio ? ` ${p.anio}` : ""}`
    const labelOC = p.ordenCompra ? `(OC ${p.ordenCompra.id.slice(0, 8)})` : "(sin OC)"

    // Filtros de descarte
    if (!p.marca || !p.modelo) {
      saltadasSinDatos++
      console.log(`  ⏭️  ${labelMoto} ${labelOC}: sin marca/modelo`)
      continue
    }
    if (!p.valor || p.valor <= 0) {
      saltadasSinDatos++
      console.log(`  ⏭️  ${labelMoto} ${labelOC}: valor inválido (${p.valor})`)
      continue
    }
    if (!p.motoRecibidaId) {
      saltadasSinMoto++
      console.log(`  ⏭️  ${labelMoto} ${labelOC}: no se cargó al stock`)
      continue
    }

    // Idempotencia: ¿ya existe un MandatoVenta linkeado a esta moto?
    const yaExiste = await prisma.mandatoVenta.findFirst({
      where: { modeloId: p.motoRecibidaId },
      select: { id: true, numero: true },
    })
    if (yaExiste) {
      saltadasYaExiste++
      console.log(
        `  ✓  ${labelMoto} ${labelOC}: ya tiene mandato MV-${String(yaExiste.numero).padStart(4, "0")}`
      )
      continue
    }

    if (DRY_RUN) {
      creados++
      console.log(
        `  📝 ${labelMoto} ${labelOC}: SE CREARÍA mandato (precio mín $${p.valor.toLocaleString("es-AR")})`
      )
      continue
    }

    // Crear el mandato real
    try {
      const extrasTxt = []
      if (p.descripcion) extrasTxt.push(p.descripcion)
      if (p.accesoriosExtra) extrasTxt.push(`Accesorios: ${p.accesoriosExtra}`)

      const m = await prisma.mandatoVenta.create({
        data: {
          clienteId: p.ordenCompra.clienteId,
          fechaFirma: p.ordenCompra.fecha,
          estado: "ACTIVO",
          marca: p.marca,
          modelo: p.modelo,
          anio: p.anio,
          kilometros: p.kilometros,
          chasis: p.chasis,
          motor: p.motor,
          patente: p.patente,
          tieneTitulo: !!p.tieneTitulo,
          tieneManual: !!p.tieneManual,
          tieneSegundaLlave: !!p.tieneSegundaLlave,
          tieneVTV: !!p.tieneVtv,
          precioVenta: p.valor,
          precioMinimo: p.valor,
          moneda: p.ordenCompra.moneda,
          modeloId: p.motoRecibidaId,
          observaciones:
            "Generado por backfill (mandato retroactivo desde permuta de OC)." +
            (extrasTxt.length ? `\n\n${extrasTxt.join("\n")}` : ""),
          fotos: [],
        },
      })
      creados++
      console.log(
        `  ✅ ${labelMoto} ${labelOC}: creado MV-${String(m.numero).padStart(4, "0")}`
      )
    } catch (e) {
      errores++
      console.log(
        `  ❌ ${labelMoto} ${labelOC}: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`
      )
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`Total permutas:                   ${permutas.length}`)
  console.log(`${DRY_RUN ? "Se crearían:" : "Creados:"}                ${creados}`)
  console.log(`Saltadas (ya tenían mandato):     ${saltadasYaExiste}`)
  console.log(`Saltadas (no en stock):           ${saltadasSinMoto}`)
  console.log(`Saltadas (datos inválidos):       ${saltadasSinDatos}`)
  console.log(`Errores:                          ${errores}`)
  if (DRY_RUN) {
    console.log(
      "\n⚠️  Estaba en --dry-run, no se guardó nada.\nSi te convence, corré el script de nuevo sin --dry-run."
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

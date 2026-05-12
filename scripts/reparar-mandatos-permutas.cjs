/**
 * Reparador de mandatos generados desde permutas.
 *
 * Hace tres cosas:
 *  1. Linkea cada mandato existente con su OCPermuta de origen (campo
 *     nuevo `ocPermutaId`). El match se hace por modeloId compartido.
 *  2. Para cada permuta que NO tiene mandato pero deberia tenerlo
 *     (tiene marca + modelo cargados), crea uno con los datos correctos.
 *  3. Para cada mandato vinculado a una permuta, sincroniza precio y
 *     moneda con los datos reales de la permuta — corrige los casos
 *     donde precio o moneda quedaron mal (ej: ARS vs USD, ceros de mas).
 *
 * Es seguro de correr varias veces (idempotente).
 *
 * Uso:
 *   node scripts/reparar-mandatos-permutas.cjs          # dry-run
 *   node scripts/reparar-mandatos-permutas.cjs --apply  # aplicar
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR cambios" : "DRY-RUN (no toca DB)"}`)
  console.log("=".repeat(70))

  // 1) Traer todas las permutas con sus motos recibidas y mandatos via modelo
  const permutas = await prisma.oCPermuta.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      ordenCompra: {
        include: {
          cliente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      motoRecibida: { select: { id: true, slug: true } },
    },
  })

  // 2) Traer todos los mandatos para buscar matches por modeloId
  const mandatos = await prisma.mandatoVenta.findMany()
  const mandatosPorModelo = new Map()
  for (const m of mandatos) {
    if (m.modeloId) mandatosPorModelo.set(m.modeloId, m)
  }

  const cambios = {
    linkeados: [],
    corregidos: [],
    creados: [],
    sinAccion: [],
  }

  for (const p of permutas) {
    if (!p.ordenCompra) continue // permuta huérfana
    const ocNum = `OC-${String(p.ordenCompra.numero).padStart(4, "0")}`
    const desc = `${p.marca || "?"} ${p.modelo || "?"} (${ocNum})`
    const monedaPermuta = p.moneda || p.ordenCompra.moneda || "ARS"

    // Buscar mandato existente: 1ro por ocPermutaId (ya migrado), 2do por modeloId
    let mandato = mandatos.find((m) => m.ocPermutaId === p.id)
    if (!mandato && p.motoRecibida) {
      mandato = mandatosPorModelo.get(p.motoRecibida.id)
    }

    if (mandato) {
      // Caso A: existe mandato, hay que sincronizar
      const cambiosM = {}
      if (mandato.ocPermutaId !== p.id) {
        cambiosM.ocPermutaId = { de: mandato.ocPermutaId, a: p.id }
      }
      // Si admin no toco el precio (= sigue igual al minimo), corregirlo
      // al valor real de la permuta. Si toco el precio, no pisar.
      const adminTocoPrecio = mandato.precioVenta !== mandato.precioMinimo
      if (mandato.precioMinimo !== p.valor) {
        cambiosM.precioMinimo = { de: mandato.precioMinimo, a: p.valor }
        if (!adminTocoPrecio) {
          cambiosM.precioVenta = { de: mandato.precioVenta, a: p.valor }
        }
      }
      if (mandato.moneda !== monedaPermuta) {
        cambiosM.moneda = { de: mandato.moneda, a: monedaPermuta }
      }
      // Sincronizar cliente con el comprador de la OC (que entrego la permuta)
      if (mandato.clienteId !== p.ordenCompra.cliente.id) {
        cambiosM.clienteId = {
          de: mandato.clienteId,
          a: p.ordenCompra.cliente.id,
        }
      }
      // Si la permuta tiene mejores datos, sincronizar
      if (p.marca && mandato.marca !== p.marca) {
        cambiosM.marca = { de: mandato.marca, a: p.marca }
      }
      if (p.modelo && mandato.modelo !== p.modelo) {
        cambiosM.modelo = { de: mandato.modelo, a: p.modelo }
      }
      if (p.anio != null && mandato.anio !== p.anio) {
        cambiosM.anio = { de: mandato.anio, a: p.anio }
      }
      if (p.kilometros != null && mandato.kilometros !== p.kilometros) {
        cambiosM.kilometros = { de: mandato.kilometros, a: p.kilometros }
      }
      if (p.patente && mandato.patente !== p.patente) {
        cambiosM.patente = { de: mandato.patente, a: p.patente }
      }
      if (p.chasis && mandato.chasis !== p.chasis) {
        cambiosM.chasis = { de: mandato.chasis, a: p.chasis }
      }
      if (p.motor && mandato.motor !== p.motor) {
        cambiosM.motor = { de: mandato.motor, a: p.motor }
      }

      if (Object.keys(cambiosM).length === 0) {
        cambios.sinAccion.push({ desc, mandato: `MV-${String(mandato.numero).padStart(4,"0")}` })
        continue
      }
      cambios.corregidos.push({
        desc,
        mandato: `MV-${String(mandato.numero).padStart(4, "0")}`,
        cambios: cambiosM,
      })
      if (APPLY) {
        const data = {}
        for (const [k, v] of Object.entries(cambiosM)) data[k] = v.a
        await prisma.mandatoVenta.update({
          where: { id: mandato.id },
          data,
        })
      }
    } else {
      // Caso B: no existe mandato. Crear si tiene marca + modelo.
      if (!p.marca || !p.modelo) {
        cambios.sinAccion.push({
          desc,
          razon: "sin marca/modelo en permuta",
        })
        continue
      }
      const valor = Math.max(0, p.valor || 0)
      const obs = `Generado automaticamente al tomar como parte de pago.${p.descripcion ? "\n\n" + p.descripcion : ""}${p.accesoriosExtra ? "\nAccesorios: " + p.accesoriosExtra : ""}`
      cambios.creados.push({
        desc,
        valor,
        moneda: monedaPermuta,
        cliente: `${p.ordenCompra.cliente.apellido}, ${p.ordenCompra.cliente.nombre}`,
      })
      if (APPLY) {
        await prisma.mandatoVenta.create({
          data: {
            clienteId: p.ordenCompra.cliente.id,
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
            precioVenta: valor,
            precioMinimo: valor,
            moneda: monedaPermuta,
            modeloId: p.motoRecibida?.id || null,
            ocPermutaId: p.id,
            observaciones: obs,
            fotos: [],
          },
        })
      }
    }
  }

  // ===== Reporte =====
  console.log(`\nPermutas analizadas: ${permutas.length}`)
  console.log(`Mandatos a corregir: ${cambios.corregidos.length}`)
  console.log(`Mandatos a crear:    ${cambios.creados.length}`)
  console.log(`Sin accion (ya OK):  ${cambios.sinAccion.length}`)

  if (cambios.corregidos.length > 0) {
    console.log("\n--- A CORREGIR ---")
    for (const c of cambios.corregidos) {
      console.log(`\n  ${c.mandato} | ${c.desc}`)
      for (const [k, v] of Object.entries(c.cambios)) {
        console.log(`    ${k}: ${v.de} → ${v.a}`)
      }
    }
  }

  if (cambios.creados.length > 0) {
    console.log("\n--- A CREAR ---")
    for (const c of cambios.creados) {
      console.log(`  + ${c.desc} | valor=${c.valor} ${c.moneda} | cliente: ${c.cliente}`)
    }
  }

  if (cambios.sinAccion.length > 0) {
    console.log("\n--- SIN ACCION ---")
    for (const s of cambios.sinAccion) {
      console.log(`  ${s.desc}${s.mandato ? " (" + s.mandato + ")" : ""}${s.razon ? " — " + s.razon : ""}`)
    }
  }

  if (!APPLY) {
    console.log("\n" + "=".repeat(70))
    console.log("DRY-RUN. Para aplicar:")
    console.log("  node scripts/reparar-mandatos-permutas.cjs --apply")
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

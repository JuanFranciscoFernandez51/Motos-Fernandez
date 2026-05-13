/**
 * Sincronizador de stock motos desde OCs concretadas.
 *
 * Recorre todas las OCs en estado CONCRETADA y se asegura de que cada
 * una tenga su correspondiente Modelo marcado como vendida (que es lo
 * que hace que aparezca en /admin/stock-motos pestaña "Vendidas").
 *
 * Tres casos:
 *   A) OC con modeloId y modelo.condicion=USADA pero vendida=false
 *      → marcar el modelo como vendida + fechaVenta + ordenCompraVentaId
 *
 *   B) OC con modeloId y modelo.condicion=0KM pero sin clon de venta
 *      → crear el clon "unidad vendida" (= comportamiento normal de venta)
 *
 *   C) OC sin modeloId (cargada solo con motoDescripcion)
 *      → crear un Modelo "post-mortem": vendida=true, activo=false, sin
 *        fotos. Aparece en stock motos como vendida pero NO en el
 *        catálogo público.
 *
 * Es seguro de correr varias veces (idempotente).
 *
 * Uso:
 *   node scripts/sincronizar-stock-desde-ocs.cjs         # dry-run
 *   node scripts/sincronizar-stock-desde-ocs.cjs --apply
 */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

// Helper minimal para generar slug. No uso el de TS porque queremos un
// fallback simple para este script CJS.
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "moto"
}

async function siguienteSlug(base) {
  const existentes = await prisma.modelo.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  if (!existentes.find((e) => e.slug === base)) return base
  const numeros = existentes
    .map((e) => {
      const m = e.slug.match(new RegExp(`^${base}-(\\d+)$`))
      return m ? parseInt(m[1], 10) : 0
    })
    .filter((n) => n > 0)
  const n = numeros.length > 0 ? Math.max(...numeros) + 1 : 2
  return `${base}-${n}`
}

async function siguienteCodigo(condicion) {
  // MF-XXXX para usadas/general, MF-0KM-XXXX para 0km
  const prefix = condicion === "0KM" ? "MF-0KM-" : "MF-"
  const all = await prisma.modelo.findMany({
    where: { codigo: { startsWith: prefix } },
    select: { codigo: true },
  })
  const numeros = all
    .map((m) => {
      const match = (m.codigo || "").match(/(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)
  const n = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
  return `${prefix}${String(n).padStart(4, "0")}`
}

async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR cambios" : "DRY-RUN (no toca DB)"}`)
  console.log("=".repeat(70))

  const ocs = await prisma.ordenCompra.findMany({
    where: { estado: "CONCRETADA" },
    orderBy: { numero: "asc" },
    include: {
      modelo: {
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          condicion: true,
          vendida: true,
          fotos: true,
        },
      },
      unidadVendida: { select: { id: true, vendida: true } },
    },
  })

  console.log(`Total OCs CONCRETADAS: ${ocs.length}`)

  const cambios = {
    usadaMarcada: [],
    clonCreado: [],
    modeloPostMortem: [],
    yaOk: [],
    errores: [],
  }

  for (const oc of ocs) {
    const num = `OC-${String(oc.numero).padStart(4, "0")}`
    const tag = `${num} — ${oc.motoDescripcion}`

    // ──── CASO A o B: OC con modeloId ────
    if (oc.modeloId && oc.modelo) {
      if (oc.modelo.condicion === "0KM") {
        // 0KM: verificar si hay clon vendido
        if (oc.unidadVendida && oc.unidadVendida.vendida) {
          cambios.yaOk.push(tag)
          continue
        }
        // Hay que crear el clon
        cambios.clonCreado.push(tag)
        if (APPLY) {
          try {
            await prisma.$transaction(async (tx) => {
              // Generar slug del clon
              const base = `${oc.modelo.slug}-u`
              const existentes = await tx.modelo.findMany({
                where: { slug: { startsWith: base } },
                select: { slug: true },
              })
              const numeros = existentes
                .map((e) => {
                  const m = e.slug.match(new RegExp(`^${base}(\\d+)$`))
                  return m ? parseInt(m[1], 10) : 0
                })
                .filter((n) => n > 0)
              const slugClon = `${base}${numeros.length > 0 ? Math.max(...numeros) + 1 : 1}`
              const codigoClon = await siguienteCodigo("0KM")
              // Traer datos completos del padre
              const padre = await tx.modelo.findUnique({
                where: { id: oc.modelo.id },
              })
              if (!padre) throw new Error("padre no encontrado")
              await tx.modelo.create({
                data: {
                  nombre: padre.nombre,
                  slug: slugClon,
                  codigo: codigoClon,
                  marca: padre.marca,
                  categoriaVehiculo: padre.categoriaVehiculo,
                  condicion: padre.condicion,
                  anio: padre.anio,
                  kilometros: padre.kilometros,
                  cilindrada: padre.cilindrada,
                  transmision: padre.transmision,
                  combustible: padre.combustible,
                  color: padre.color,
                  precio: padre.precio,
                  moneda: padre.moneda,
                  descripcion: padre.descripcion,
                  observaciones: padre.observaciones,
                  fotos: padre.fotos,
                  etiqueta: null,
                  orden: padre.orden,
                  chasis: oc.motoChasis,
                  motor: oc.motoMotor,
                  patente: oc.motoPatente,
                  vendida: true,
                  fechaVenta: oc.fecha,
                  activo: false,
                  origen: "UNIDAD_VENDIDA_0KM",
                  modeloOrigenId: padre.id,
                  ordenCompraVentaId: oc.id,
                },
              })
            })
          } catch (e) {
            cambios.errores.push({ tag, error: e.message })
          }
        }
      } else {
        // USADA: solo marcar como vendida si no lo está
        if (oc.modelo.vendida) {
          cambios.yaOk.push(tag)
          continue
        }
        cambios.usadaMarcada.push(tag)
        if (APPLY) {
          try {
            await prisma.modelo.update({
              where: { id: oc.modelo.id },
              data: {
                vendida: true,
                fechaVenta: oc.fecha,
                activo: false,
                ordenCompraVentaId: oc.id,
              },
            })
          } catch (e) {
            cambios.errores.push({ tag, error: e.message })
          }
        }
      }
      continue
    }

    // ──── CASO C: OC sin modeloId — crear modelo post-mortem ────
    // Si ya existe un modelo con ordenCompraVentaId = oc.id, no duplicar
    const existePost = await prisma.modelo.findFirst({
      where: { ordenCompraVentaId: oc.id },
      select: { id: true },
    })
    if (existePost) {
      cambios.yaOk.push(tag)
      continue
    }

    // Parsear marca y nombre desde motoDescripcion
    const desc = (oc.motoDescripcion || "").trim()
    const partes = desc.split(/\s+/)
    const marca = partes[0] || "Sin marca"
    const nombre = partes.slice(1).join(" ") || desc || "Sin modelo"

    cambios.modeloPostMortem.push({
      tag,
      marca,
      nombre,
      anio: oc.motoAnio,
      patente: oc.motoPatente,
    })

    if (APPLY) {
      try {
        const slug = await siguienteSlug(slugify(`${marca}-${nombre}-vendida`))
        const codigo = await siguienteCodigo("USADA")
        await prisma.modelo.create({
          data: {
            nombre,
            slug,
            codigo,
            marca,
            condicion: "USADA",
            anio: oc.motoAnio,
            kilometros: oc.motoKilometros,
            chasis: oc.motoChasis,
            motor: oc.motoMotor,
            patente: oc.motoPatente,
            precio: oc.precioVenta,
            moneda: oc.moneda,
            descripcion: null,
            fotos: [],
            vendida: true,
            fechaVenta: oc.fecha,
            activo: false,
            origen: "STOCK_PROPIO",
            ordenCompraVentaId: oc.id,
          },
        })
        // Linkear la OC al modelo nuevo para mantener trazabilidad
        const nuevo = await prisma.modelo.findFirst({
          where: { ordenCompraVentaId: oc.id },
          select: { id: true },
        })
        if (nuevo) {
          await prisma.ordenCompra.update({
            where: { id: oc.id },
            data: { modeloId: nuevo.id },
          })
        }
      } catch (e) {
        cambios.errores.push({ tag, error: e.message })
      }
    }
  }

  console.log("\n──── RESUMEN ────")
  console.log(`Usadas a marcar como vendidas: ${cambios.usadaMarcada.length}`)
  console.log(`Clones 0KM a crear:            ${cambios.clonCreado.length}`)
  console.log(`Modelos post-mortem a crear:   ${cambios.modeloPostMortem.length}`)
  console.log(`Ya OK (sin cambios):           ${cambios.yaOk.length}`)
  console.log(`Errores:                       ${cambios.errores.length}`)

  if (cambios.usadaMarcada.length > 0) {
    console.log("\n--- USADAS A MARCAR ---")
    for (const t of cambios.usadaMarcada) console.log(`  ${t}`)
  }
  if (cambios.clonCreado.length > 0) {
    console.log("\n--- CLONES 0KM A CREAR ---")
    for (const t of cambios.clonCreado) console.log(`  ${t}`)
  }
  if (cambios.modeloPostMortem.length > 0) {
    console.log("\n--- MODELOS POST-MORTEM A CREAR ---")
    for (const m of cambios.modeloPostMortem) {
      console.log(
        `  ${m.tag} → ${m.marca} ${m.nombre}${m.anio ? " " + m.anio : ""}${m.patente ? " (" + m.patente + ")" : ""}`
      )
    }
  }
  if (cambios.errores.length > 0) {
    console.log("\n--- ERRORES ---")
    for (const e of cambios.errores) console.log(`  ✗ ${e.tag}: ${e.error}`)
  }

  if (!APPLY) {
    console.log("\n" + "=".repeat(70))
    console.log("DRY-RUN. Para aplicar:")
    console.log("  node scripts/sincronizar-stock-desde-ocs.cjs --apply")
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

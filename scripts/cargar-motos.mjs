import { PrismaClient } from "@prisma/client"
import fs from "fs"

const prisma = new PrismaClient()

// Logo placeholder para todas las motos nuevas (hasta que se carguen las fotos reales)
const LOGO_PLACEHOLDER = "/images/logo-clasico.png"

function parsePrice(raw) {
  if (!raw) return null
  const num = parseInt(String(raw).replace(/[^0-9]/g, ""), 10)
  return Number.isFinite(num) ? num : null
}

function mapBodyStyle(bs) {
  // El schema solo tiene MOTOCICLETA, CUATRICICLO, UTV, MOTO_DE_AGUA
  // Todas las del Excel son motos
  return "MOTOCICLETA"
}

function mapEtiqueta(state, notas) {
  if (notas && /REVISAR|FALTA|CONSULTAR/i.test(String(notas))) return "CONSULTAR_STOCK"
  return null
}

async function main() {
  const motos = JSON.parse(fs.readFileSync("./scripts/motos-excel.json", "utf8"))
  console.log(`Motos a cargar: ${motos.length}`)

  // 1) Borrar motos sin fotos
  const sinFotos = await prisma.modelo.findMany({
    where: { fotos: { isEmpty: true } },
    select: { id: true, slug: true },
  })
  console.log(`\n[1/3] Borrando ${sinFotos.length} motos sin fotos...`)
  for (const m of sinFotos) {
    await prisma.modelo.delete({ where: { id: m.id } })
    console.log(`  - ${m.slug} eliminada`)
  }

  // 2) Cargar las 45 nuevas del Excel
  console.log(`\n[2/3] Cargando ${motos.length} motos del Excel...`)
  for (const m of motos) {
    const slug = m.codigo.toLowerCase() // mf001, mf002...
    const condicion = m.state === "NEW" ? "0KM" : "USADA"
    const anio = typeof m.anio === "number" ? m.anio : null
    const km = typeof m.km === "number" ? m.km : null
    const precio = parsePrice(m.precio_raw)
    const etiqueta = mapEtiqueta(m.state, m.notas)

    await prisma.modelo.upsert({
      where: { slug },
      update: {
        nombre: m.nombre,
        marca: m.marca,
        condicion,
        anio,
        kilometros: km,
        precio,
        moneda: "ARS",
        descripcion: m.descripcion,
        fotos: [LOGO_PLACEHOLDER],
        activo: false,
        etiqueta,
      },
      create: {
        slug,
        nombre: m.nombre,
        marca: m.marca,
        categoriaVehiculo: "MOTOCICLETA",
        condicion,
        anio,
        kilometros: km,
        precio,
        moneda: "ARS",
        descripcion: m.descripcion,
        fotos: [LOGO_PLACEHOLDER],
        activo: false,
        destacado: false,
        etiqueta,
      },
    })
    console.log(`  + ${m.codigo} ${m.nombre} (${condicion}${km ? ` · ${km}km` : ""}${precio ? ` · $${precio.toLocaleString("es-AR")}` : ""})`)
  }

  // 3) Asignar códigos MF046+ a las existentes con fotos
  console.log(`\n[3/3] Renumerando motos existentes (MF046+)...`)
  const existentes = await prisma.modelo.findMany({
    where: {
      AND: [
        { fotos: { isEmpty: false } },
        { NOT: { slug: { startsWith: "mf0" } } },
        { NOT: { slug: { startsWith: "mf1" } } },
      ],
    },
    orderBy: { createdAt: "asc" },
  })
  let n = 46
  for (const m of existentes) {
    const nuevoSlug = `mf${String(n).padStart(3, "0")}`
    await prisma.modelo.update({
      where: { id: m.id },
      data: { slug: nuevoSlug },
    })
    console.log(`  ~ ${m.slug.padEnd(35)} → ${nuevoSlug} (${m.nombre})`)
    n++
  }

  const totalFinal = await prisma.modelo.count()
  const activasFinal = await prisma.modelo.count({ where: { activo: true } })
  console.log(`\n✓ LISTO. Total modelos: ${totalFinal} | Activas: ${activasFinal}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})

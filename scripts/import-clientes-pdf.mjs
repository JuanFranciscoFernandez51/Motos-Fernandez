// Parser e importador del PDF "Clientes_VespaBahia.pdf" (1261 clientes
// historicos pre-2007). Hace dedup por DNI contra los 1656 ya importados.
//
// USO:
//   node scripts/import-clientes-pdf.mjs --dry-run [path/al/pdf]   # NO escribe DB
//   node scripts/import-clientes-pdf.mjs [path/al/pdf]              # importa
//   node scripts/import-clientes-pdf.mjs --sample 5                  # imprime 5 al azar
//
// Default path: el PDF en local-agent-mode-sessions de Claude.
import { createRequire } from "module"
import { config } from "dotenv"
config({ path: ".env.local", override: true })

const require = createRequire(import.meta.url)
const fs = require("fs")
const { PrismaClient } = require("@prisma/client")
const { PDFParse } = require("pdf-parse")

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const sampleIdx = args.indexOf("--sample")
const SAMPLE_N = sampleIdx >= 0 ? parseInt(args[sampleIdx + 1] || "5") : 0
const PDF_PATH =
  args.find((a) => a.endsWith(".pdf")) ||
  "/Users/juanfri/Library/Application Support/Claude/local-agent-mode-sessions/a681e2f3-79de-473a-8b7d-e819f2fb52d5/2167e449-4528-4f53-92c0-daf1459d4039/local_c6174f77-e569-4bd9-b1e8-eb8ce3d16145/outputs/Clientes_VespaBahia.pdf"

const SEPARADOR = "————————————————————————————————————————"

// ========== EXTRACCIÓN ==========

async function extraerTextoPDF(path) {
  const buf = fs.readFileSync(path)
  const parser = new PDFParse({ data: buf })
  // Trae todas las páginas
  const result = await parser.getText()
  // result.pages es array de { text, num }
  return result.pages.map((p) => p.text).join("\n")
}

// Separa el texto crudo en bloques, uno por cliente.
function dividirEnBloques(texto) {
  // Quitamos header
  const sinHeader = texto
    .replace(/^Listado de Clientes.*$/m, "")
    .replace(/^Total:.*$/m, "")
  // Splittear por separador
  return sinHeader
    .split(SEPARADOR)
    .map((b) => b.trim())
    .filter((b) => b.length > 5)
}

// ========== PARSING POR BLOQUE ==========

function parsearBloque(bloque) {
  const lineas = bloque.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lineas.length === 0) return null
  const primeraLinea = lineas[0]
  const resto = lineas.slice(1).join("\n")

  // Nombre + apellido a partir de primera línea (en mayúsculas)
  const { apellido, nombre } = parsearNombre(primeraLinea)
  if (!apellido && !nombre) return null

  // DNI: primer match. Capturar 7-9 dígitos con o sin puntos.
  // Tomamos el PRIMERO antes de "GARANTE/GTE" para evitar tomar el del garante.
  const antesDeGarante = bloque.split(/\bGARANTE\b|\bGTE\b/i)[0]
  const dniMatch =
    antesDeGarante.match(/\bDNI[:\s\.]*(\d{1,3}\.?\d{3}\.?\d{3})/i) ||
    antesDeGarante.match(/\bDNI[:\s\.]*(\d{7,9})/i) ||
    bloque.match(/\bDNI[:\s\.]*(\d{1,3}\.?\d{3}\.?\d{3})/i)
  const dni = dniMatch ? dniMatch[1].replace(/\./g, "") : null

  // Teléfono(s): match flexible. Deduplicar (a veces el bloque .crd repite
  // el mismo número 2 veces) y descartar si telAlt == tel.
  const telMatches = [
    ...bloque.matchAll(/\bTEL[\.:\s]*([\d\-\/\s]{6,30})/gi),
  ]
  const telefonosUnicos = []
  for (const m of telMatches) {
    const t = limpiarTel(m[1])
    if (t && t.length >= 6 && !telefonosUnicos.includes(t)) {
      telefonosUnicos.push(t)
    }
  }
  const telefonos = telefonosUnicos

  // Dirección: buscar línea con "Domicilio:" o "DOMICILIO:" o "Domidilio:"
  // (típo en el .crd: "Domidilio")
  const dirMatch = bloque.match(/Domi(?:c|d)ilio[:\s]+([^\n]+)/i)
  let direccion = dirMatch ? dirMatch[1].trim() : null
  // Si no hay "Domicilio:", buscar línea típica de calle (segunda línea)
  if (!direccion && lineas.length > 1) {
    const seg = lineas[1]
    if (
      /\d/.test(seg) &&
      seg.length < 80 &&
      !/^DNI/i.test(seg) &&
      !/^GARANTE/i.test(seg) &&
      !/^GTE/i.test(seg)
    ) {
      direccion = seg
    }
  }

  // Notas internas: el bloque entero como histórico (motos, garantes, etc)
  const notasInternas = limpiarNotas(resto)

  return {
    apellido,
    nombre,
    dni,
    telefono: telefonos[0] || null,
    telefonoAlt: telefonos[1] || null,
    direccion,
    notasInternas,
    bloqueOriginal: bloque,
  }
}

function parsearNombre(linea) {
  const limpio = linea.replace(/[\.,]+$/g, "").trim()
  if (limpio.length < 2 || limpio.length > 80) return { apellido: "", nombre: "" }

  // Caso "APELLIDO, NOMBRE" → split por coma
  if (limpio.includes(",")) {
    const partes = limpio.split(",")
    return {
      apellido: capitalizarNombre(partes[0]),
      nombre: capitalizarNombre(partes.slice(1).join(",")),
    }
  }

  // Caso "APELLIDO NOMBRE" → primera palabra es apellido (heurística simple)
  const partes = limpio.split(/\s+/).filter(Boolean)
  if (partes.length === 1) {
    return { apellido: capitalizarNombre(partes[0]), nombre: "" }
  }
  // Para nombres tipo "ABADIA JOSE LUIS" → apellido=ABADIA, nombre="JOSE LUIS"
  return {
    apellido: capitalizarNombre(partes[0]),
    nombre: capitalizarNombre(partes.slice(1).join(" ")),
  }
}

function capitalizarNombre(s) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .trim()
}

function limpiarTel(s) {
  // Tomar solo lo numérico/separadores típicos, quitar espacios extra
  const m = s.match(/[\d\-\s\(\)\/]+/)
  if (!m) return null
  let t = m[0]
    .replace(/\s+/g, "")
    .replace(/[\(\)]/g, "")
    .replace(/^[\-\/]+/, "")
    .replace(/[\-\/]+$/, "")
  // Si tiene una fecha al final tipo "/DD/MM/YY" o "DDMMYY" pegada, cortar.
  // Heurística: si después de un / aparece un número de 2-2-2 o 2-2-4, cortar ahí.
  t = t.replace(/\/?\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, "")
  // Si terminó con /, quitar
  t = t.replace(/[\-\/]+$/, "")
  return t.slice(0, 30) || null
}

function limpiarNotas(s) {
  // Deduplicar líneas consecutivas idénticas (el .crd a veces escribió
  // bloques duplicados al pegar campos del cardfile).
  const lineas = s.split("\n")
  const dedup = []
  for (const l of lineas) {
    if (dedup.length === 0 || dedup[dedup.length - 1] !== l) {
      dedup.push(l)
    }
  }
  // Y deduplicar bloques de líneas consecutivas (cuando el patrón viene 2x)
  const txt = dedup.join("\n")
  // Si las primeras 5 líneas se repiten textualmente más adelante, sacar
  const top5 = dedup.slice(0, 5).join("\n").trim()
  if (top5.length > 30) {
    const idx2 = txt.indexOf(top5, top5.length + 1)
    if (idx2 > 0 && idx2 < txt.length - 10) {
      return (txt.slice(0, idx2) + "\n[...resto similar omitido...]").trim().slice(0, 5000)
    }
  }
  return txt
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 5000)
}

// ========== DEDUP + IMPORT ==========

async function obtenerDNIsExistentes() {
  const todos = await prisma.cliente.findMany({
    select: { dni: true, apellido: true, nombre: true },
  })
  const porDni = new Set()
  const porNombre = new Set()
  for (const c of todos) {
    if (c.dni) porDni.add(c.dni.replace(/\./g, ""))
    porNombre.add(`${c.apellido?.toLowerCase()}|${c.nombre?.toLowerCase()}`.trim())
  }
  return { porDni, porNombre, total: todos.length }
}

async function main() {
  console.log(`📄 Leyendo PDF: ${PDF_PATH}`)
  const texto = await extraerTextoPDF(PDF_PATH)
  console.log(`✅ Extraído. ${texto.length.toLocaleString()} caracteres.\n`)

  const bloques = dividirEnBloques(texto)
  console.log(`📋 Bloques de cliente detectados: ${bloques.length}`)

  const parseados = bloques.map(parsearBloque).filter(Boolean)
  console.log(`📋 Clientes parseados con éxito: ${parseados.length}`)
  console.log(
    `   Con DNI: ${parseados.filter((c) => c.dni).length} (${Math.round(
      (parseados.filter((c) => c.dni).length / parseados.length) * 100
    )}%)`
  )
  console.log(
    `   Con teléfono: ${parseados.filter((c) => c.telefono).length} (${Math.round(
      (parseados.filter((c) => c.telefono).length / parseados.length) * 100
    )}%)`
  )
  console.log(
    `   Con dirección: ${parseados.filter((c) => c.direccion).length} (${Math.round(
      (parseados.filter((c) => c.direccion).length / parseados.length) * 100
    )}%)`
  )

  const dups = await obtenerDNIsExistentes()
  console.log(`\n👥 Clientes ya en DB: ${dups.total}`)
  console.log(`   Con DNI: ${dups.porDni.size}`)

  const nuevos = []
  const yaPorDni = []
  const yaPorNombre = []
  const sinIdentificacion = []

  for (const c of parseados) {
    const keyNombre = `${c.apellido?.toLowerCase()}|${c.nombre?.toLowerCase()}`.trim()
    if (c.dni && dups.porDni.has(c.dni)) {
      yaPorDni.push(c)
    } else if (!c.dni && dups.porNombre.has(keyNombre)) {
      yaPorNombre.push(c)
    } else if (!c.dni && !c.telefono && !c.direccion) {
      sinIdentificacion.push(c)
    } else {
      nuevos.push(c)
    }
  }

  console.log(`\n📊 Resultado del dedup:`)
  console.log(`   ✨ NUEVOS a importar:           ${nuevos.length}`)
  console.log(`   🔁 Ya existen por DNI:           ${yaPorDni.length}`)
  console.log(`   🔁 Ya existen por nombre+apellido: ${yaPorNombre.length}`)
  console.log(`   ⚠️  Sin DNI/tel/dir (revisar):  ${sinIdentificacion.length}`)

  // Muestra
  if (SAMPLE_N > 0 || DRY_RUN) {
    const n = Math.max(SAMPLE_N, 5)
    console.log(`\n=== MUESTRA (${n} clientes nuevos al azar) ===`)
    const muestra = nuevos.sort(() => Math.random() - 0.5).slice(0, n)
    for (const c of muestra) {
      console.log(`\n--- ${c.apellido}, ${c.nombre} ---`)
      console.log(`  DNI:        ${c.dni || "—"}`)
      console.log(`  Teléfono:   ${c.telefono || "—"}`)
      console.log(`  Tel alt:    ${c.telefonoAlt || "—"}`)
      console.log(`  Dirección:  ${c.direccion || "—"}`)
      console.log(`  Notas (${c.notasInternas?.length || 0} chars):`)
      console.log(
        "    " +
          (c.notasInternas || "").split("\n").slice(0, 6).join("\n    ").slice(0, 500)
      )
    }
  }

  if (DRY_RUN) {
    console.log(
      `\n⚠️  DRY-RUN: NO se escribió nada en la DB.\nSi te convence, corré el script SIN --dry-run para importar los ${nuevos.length} nuevos.`
    )
    return
  }

  // ========== IMPORT REAL ==========
  // Procesamos TODOS los clientes parseados (no solo "nuevos") porque el
  // PDF tiene DNIs duplicados internos: un mismo cliente aparece varias
  // veces con compras de motos en distintas fechas. Para cada uno:
  //   - Si DNI ya está en DB → MERGEAR el bloque a notasInternas (idempotente)
  //   - Si NO está → crear nuevo
  console.log(`\n🚀 Procesando ${parseados.length} clientes (merge para duplicados)...\n`)
  const fecha = new Date().toISOString().split("T")[0]
  const PREFIX_IMPORT = `[Importado del archivo histórico CLIENTES200417_16.CRD el ${fecha}]`
  let creados = 0
  let mergeados = 0
  let yaEstaba = 0
  let fail = 0

  for (let i = 0; i < parseados.length; i++) {
    const c = parseados[i]
    try {
      let existente = null
      if (c.dni) {
        existente = await prisma.cliente.findUnique({ where: { dni: c.dni } })
      }
      if (!existente && !c.dni) {
        // Sin DNI: matchear por apellido+nombre exacto
        existente = await prisma.cliente.findFirst({
          where: {
            apellido: c.apellido,
            nombre: c.nombre || c.apellido,
          },
        })
      }

      if (existente) {
        // Verificar si el bloque ya fue mergeado antes (idempotencia).
        const sniff = (c.notasInternas || "").slice(0, 80)
        const yaIncluye =
          sniff && existente.notasInternas?.includes(sniff)
        if (yaIncluye) {
          yaEstaba++
        } else {
          await prisma.cliente.update({
            where: { id: existente.id },
            data: {
              notasInternas:
                (existente.notasInternas || "") +
                `\n\n--- Bloque adicional del .crd (${fecha}) ---\n` +
                (c.notasInternas || ""),
              // Si el existente no tenía teléfono y este sí, lo agregamos
              telefono: existente.telefono || c.telefono,
              telefonoAlt: existente.telefonoAlt || c.telefonoAlt,
              direccion: existente.direccion || c.direccion,
            },
          })
          mergeados++
        }
      } else {
        await prisma.cliente.create({
          data: {
            apellido: c.apellido,
            nombre: c.nombre || c.apellido,
            dni: c.dni,
            telefono: c.telefono,
            telefonoAlt: c.telefonoAlt,
            direccion: c.direccion,
            notasInternas: PREFIX_IMPORT + "\n\n" + (c.notasInternas || ""),
          },
        })
        creados++
      }
      if ((i + 1) % 100 === 0) {
        console.log(
          `  [${i + 1}/${parseados.length}] creados:${creados} mergeados:${mergeados} ya:${yaEstaba} fail:${fail}`
        )
      }
    } catch (e) {
      fail++
      console.warn(
        `  ❌ ${c.apellido}, ${c.nombre}: ${e instanceof Error ? e.message.slice(0, 120) : "error"}`
      )
    }
  }
  console.log(`\n=== RESUMEN ===`)
  console.log(`✨ Creados nuevos:                   ${creados}`)
  console.log(`🔁 Mergeados a cliente existente:    ${mergeados}`)
  console.log(`⏭️  Ya estaba mergeado (idempotente): ${yaEstaba}`)
  console.log(`❌ Fallidos:                         ${fail}`)
}

main()
  .catch((e) => {
    console.error("FATAL:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// Importa clientes en bulk desde un JSON al modelo Cliente.
//
// USO:
//   node scripts/import-clientes.mjs path/al/clientes.json
//
// Formato esperado del JSON: array de objetos con los campos del schema Cliente.
// Solo "nombre" y "apellido" son obligatorios — el resto opcional.
//
//   [
//     {
//       "nombre": "Juan",
//       "apellido": "Perez",
//       "dni": "28456123",
//       "cuit": null,
//       "email": "juan@example.com",
//       "telefono": "2914567890",
//       "telefonoAlt": null,
//       "direccion": "Av. Colón 1500",
//       "ciudad": "Bahía Blanca",
//       "provincia": "Buenos Aires",
//       "codigoPostal": "8000",
//       "ocupacion": "Mecánico",
//       "notasInternas": "Compró Honda Wave 2018"
//     },
//     ...
//   ]
//
// Reglas:
// - Si una fila no tiene apellido, lo intenta extraer del nombre ("Juan Perez" -> nombre=Juan, apellido=Perez).
// - Si una fila no tiene ni nombre ni apellido, se omite y se reporta.
// - Si ya existe un cliente con el mismo DNI, se actualiza (no se duplica).
// - Reporta al final: creados, actualizados, omitidos, errores por fila.

import { PrismaClient } from "@prisma/client"
import fs from "node:fs"
import path from "node:path"
import { config } from "dotenv"
config({ path: ".env.local" })

const prisma = new PrismaClient()

function clean(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function splitNombreCompleto(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { nombre: "", apellido: "" }
  if (parts.length === 1) return { nombre: parts[0], apellido: "" }
  // Heuristica simple: ultimo token = apellido, resto = nombre.
  // (Ojo con apellidos compuestos tipo "De la Cruz" -> requeriria matchear listas.
  //  Por ahora si el dump trae "Juan De la Cruz" lo va a partir mal.
  //  Mejor: en el JSON pasar nombre/apellido ya separados.)
  return {
    nombre: parts.slice(0, -1).join(" "),
    apellido: parts[parts.length - 1],
  }
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error("Uso: node scripts/import-clientes.mjs path/al/clientes.json")
    process.exit(1)
  }
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error(`No encontrado: ${abs}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(abs, "utf8")
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) {
    console.error("El JSON debe ser un array de objetos.")
    process.exit(1)
  }

  console.log(`📦 Importando ${data.length} clientes desde ${abs}\n`)

  let creados = 0
  let actualizados = 0
  let omitidos = 0
  const errores = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    try {
      let nombre = clean(row.nombre)
      let apellido = clean(row.apellido)

      // Si solo viene "nombre completo", partirlo
      if (!apellido && nombre && nombre.includes(" ")) {
        const split = splitNombreCompleto(nombre)
        nombre = split.nombre
        apellido = split.apellido
      }
      // Si no hay nada
      if (!nombre && !apellido) {
        omitidos++
        errores.push(`Fila ${i + 1}: sin nombre ni apellido — omitido`)
        continue
      }
      // Si solo hay nombre y nada de apellido, lo dejamos como nombre y apellido vacio
      // (el schema lo permite — apellido es String, no opcional, pero podemos meter "—")
      if (!apellido) apellido = "—"
      if (!nombre) nombre = "—"

      const data_ = {
        nombre,
        apellido,
        dni: clean(row.dni),
        cuit: clean(row.cuit),
        email: clean(row.email),
        telefono: clean(row.telefono),
        telefonoAlt: clean(row.telefonoAlt),
        direccion: clean(row.direccion),
        ciudad: clean(row.ciudad),
        provincia: clean(row.provincia),
        codigoPostal: clean(row.codigoPostal),
        ocupacion: clean(row.ocupacion),
        notasInternas: clean(row.notasInternas),
      }

      // Si tiene DNI, dedup por DNI (update si existe). Sino, crear.
      if (data_.dni) {
        const existente = await prisma.cliente.findUnique({
          where: { dni: data_.dni },
        })
        if (existente) {
          await prisma.cliente.update({
            where: { id: existente.id },
            data: data_,
          })
          actualizados++
        } else {
          await prisma.cliente.create({ data: data_ })
          creados++
        }
      } else {
        await prisma.cliente.create({ data: data_ })
        creados++
      }

      if ((i + 1) % 50 === 0) {
        console.log(`  ... ${i + 1}/${data.length}`)
      }
    } catch (e) {
      omitidos++
      const msg = e instanceof Error ? e.message : String(e)
      errores.push(`Fila ${i + 1} (${row.nombre || ""} ${row.apellido || ""}): ${msg}`)
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`✅ Creados:      ${creados}`)
  console.log(`🔄 Actualizados: ${actualizados}`)
  console.log(`⚠️  Omitidos:    ${omitidos}`)
  if (errores.length > 0) {
    console.log(`\nErrores (${errores.length}):`)
    errores.slice(0, 30).forEach((e) => console.log(`  - ${e}`))
    if (errores.length > 30) {
      console.log(`  ... y ${errores.length - 30} más`)
    }
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

// Parser para los emails dump del Cardfile de Motos Fernández.
//
// Formato detectado:
//   ----------------------------------------
//   NOMBRE APELLIDO
//   ........................................
//   <linea(s) con direccion + telefono + DNI mezclados>
//   <linea(s) con vehiculos comprados: DD/MM/YY MARCA MODELO ...>
//   ----------------------------------------
//
// USO:
//   node scripts/parse-cardfile.mjs tmp/clientes-1.txt tmp/clientes-2.txt > tmp/clientes.json
//
// Genera un JSON con un array de objetos listos para import-clientes.mjs

import fs from "node:fs"
import path from "node:path"

// ---------- helpers ----------

const DOTS = /^\.{30,}$/
const DASHES = /^-{30,}$/

function clean(s) {
  if (s == null) return null
  const t = String(s).trim()
  return t === "" ? null : t
}

// "JUAN PEREZ" -> { nombre: "Juan", apellido: "Perez" }
// "ABELLI, LUIS DARIO" (con coma) -> { nombre: "Luis Dario", apellido: "Abelli" }
// "DE MIRA MAURO" -> { nombre: "Mauro", apellido: "De Mira" } (apellido compuesto)
// "DE LA TORRE JUAN" -> { nombre: "Juan", apellido: "De La Torre" }
const PREFIJOS_COMPUESTOS_2 = new Set(["DE", "DEL", "LA", "LAS", "LOS", "VAN", "VON", "DA", "DI", "DO", "MAC", "MC", "ST", "SAN", "SANTA"])
const PREFIJOS_COMPUESTOS_3_INICIO = ["DE LA", "DE LOS", "DE LAS", "DEL LA", "VAN DER", "VAN DE", "VAN DEN"]

function parseNombre(linea) {
  const t = linea.trim()
  if (!t) return { nombre: "", apellido: "" }
  // Si tiene coma: lo de antes es apellido, lo de despues es nombre
  if (t.includes(",")) {
    const [ape, nom] = t.split(",", 2)
    return { nombre: titleCase(nom?.trim() || ""), apellido: titleCase(ape.trim()) }
  }
  // Sino: primer token = apellido, resto = nombre
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { nombre: titleCase(parts[0]), apellido: "—" }

  // Detectar apellido compuesto de 3 palabras (ej: "DE LA TORRE")
  if (parts.length >= 4) {
    const prefix3 = `${parts[0].toUpperCase()} ${parts[1].toUpperCase()}`
    if (PREFIJOS_COMPUESTOS_3_INICIO.includes(prefix3)) {
      return {
        nombre: titleCase(parts.slice(3).join(" ")),
        apellido: titleCase(parts.slice(0, 3).join(" ")),
      }
    }
  }
  // Detectar apellido compuesto de 2 palabras (ej: "DE MIRA")
  if (parts.length >= 3 && PREFIJOS_COMPUESTOS_2.has(parts[0].toUpperCase())) {
    return {
      nombre: titleCase(parts.slice(2).join(" ")),
      apellido: titleCase(parts.slice(0, 2).join(" ")),
    }
  }
  // Default: primer token = apellido
  return {
    nombre: titleCase(parts.slice(1).join(" ")),
    apellido: titleCase(parts[0]),
  }
}

function titleCase(s) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

// Extrae DNI del cuerpo del card. Busca patrones:
//   DNI 12.345.678  /  DNI: 12.345.678  /  DNI:12345678
//   LE 5.500.240    /  LE: 5500240
function extractDNI(body) {
  const m = body.match(
    /\b(?:DNI|LE|L\.E\.|D\.N\.I\.)\.?\s*[:\.]?\s*(\d{1,3}(?:[\.\s]?\d{3})*)/i
  )
  if (!m) return null
  const limpio = m[1].replace(/[\.\s]/g, "")
  // DNI valido: 7-8 digitos
  if (limpio.length >= 7 && limpio.length <= 9) return limpio
  return null
}

// Extrae telefonos del cuerpo. Patrones tipicos:
//   TEL.4815298  /  Tel: 4881547  /  TEL 155701167
//   TEL.4517573//155716358  (dos numeros)
//   TEL,2921-497030291  -155705002  (dos numeros con comas/dashes)
//   02965-426361  /  291-4023840  /  154132577
// Devuelve {telefono, telefonoAlt}.
function extractTelefonos(body) {
  // Buscar todos los matches de "TEL/Tel/CEL ..." y juntarlos
  const matches = []
  const reTel = /\b(?:TEL|Tel|tel|TE|CEL|Cel|cel)[\s\.,:\-]*([\d\-\.\/\s,]+?)(?=\s*(?:DNI|LE|L\.E\.|$|\n|\b[A-Z]{2,}))/gi
  let m
  while ((m = reTel.exec(body)) !== null) {
    matches.push(m[1])
  }
  if (matches.length === 0) {
    const m2 = body.match(/\b(\d{7,})\b/)
    return { telefono: m2 ? m2[1] : null, telefonoAlt: null }
  }
  // Splittear cada match por separadores y juntar todos los numeros
  const numeros = []
  for (const raw of matches) {
    const partes = raw.split(/[\/,]+|--+|(?<=\d)\s+(?=\d)/g)
    for (const p of partes) {
      const limpio = p.replace(/[^\d\-]/g, "").replace(/^[\-]+|[\-]+$/g, "").replace(/\-/g, "")
      if (limpio.length >= 6 && limpio.length <= 15) {
        if (!numeros.includes(limpio)) numeros.push(limpio)
      }
    }
  }
  return {
    telefono: numeros[0] || null,
    telefonoAlt: numeros[1] || null,
  }
}

// Extrae email
function extractEmail(body) {
  const m = body.match(/[\w\.\-_]+@[\w\.\-_]+\.\w+/i)
  return m ? m[0].toLowerCase() : null
}

// Lista de ciudades conocidas que aparecen en los datos (para reconocer
// cuando estan pegadas al final de la direccion).
const CIUDADES_CONOCIDAS = [
  "BAHIA BLANCA", "BAHÍA BLANCA", "B.BCA", "BBCA",
  "PIGUE", "PIGÜÉ", "TRELEW", "VIEDMA", "CIPOLLETTI", "CIPOLETTI",
  "HILARIO ASCASUBI", "ASCASUBI", "PEDRO LURO", "P.LURO",
  "CNEL.DORREGO", "CORONEL DORREGO", "CNEL DORREGO",
  "CNEL.PRINGLES", "CORONEL PRINGLES", "PRINGLES",
  "TORNQUIST", "MTE.HERMOSO", "MONTE HERMOSO",
  "GRAL.CERRI", "GRAL CERRI", "GENERAL CERRI", "G.CERRI",
  "GRAL.LAMADRID", "GENERAL LAMADRID", "LAMADRID",
  "GRAL.ACHA", "GRAL ACHA", "GENERAL ACHA", "ACHA",
  "ING.WHITE", "ING WHITE", "INGENIERO WHITE", "WHITE",
  "USHUAIA", "COMODORO RIVADAVIA", "COMODORO",
  "VILLALONGA", "M.BURATOVICH", "MEDANOS", "MÉDANOS",
  "SALLIQUELO", "SALLIQUELÓ", "CABILDO", "PUNTA ALTA",
  "INGENIERO HUERGO", "HUERGO", "SIERRA GRANDE",
  "RIO COLORADO", "RÍO COLORADO", "SAN BLAS",
  "SAAVEDRA", "TRES ARROYOS", "BENITO JUAREZ",
]
// Solo matchear ciudad al FINAL de la direccion, separada por al menos un
// espacio (no se come digitos). Ej: "SAN MARTIN 652 TORNQUIST" -> ciudad
// "Tornquist", direccion "SAN MARTIN 652".
const CIUDADES_REGEX = new RegExp(
  "\\s+(" +
    CIUDADES_CONOCIDAS.sort((a, b) => b.length - a.length)
      .map((c) => c.replace(/\./g, "\\.").replace(/\s+/g, "\\s+"))
      .join("|") +
    ")\\s*$",
  "i"
)

// Extrae direccion + ciudad heuristicamente.
function extractDireccionCiudad(body) {
  const lineas = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (const linea of lineas) {
    let limpia = linea
      // Sacar prefijos
      .replace(/^Domicilio\s*:?\s*/i, "")
      .replace(/^Dom\.?\s*Com\.?\s*:?\s*/i, "")
      .replace(/^Dom\.?\s*:?\s*/i, "")
      .replace(/^Dcilio\s*:?\s*/i, "")
      .replace(/^Domidilio\s*:?\s*/i, "") // typos
      // Sacar parte del telefono (mas agresivo: incluye "TEL291-..." pegado)
      .replace(/\s*(?:TEL|Tel|tel|CEL|Cel|cel)[\.:]?\s*[\d\-\.\/\s]+/g, " ")
      .replace(/\s*\bTE[\.\s:]*[\d\-\.\/]+/g, " ") // "TE.4561128"
      .replace(/\s*\b\d{2,4}-\d{4,}\b/g, " ") // codigos area pegados
      .replace(/\s*\b(?:DNI|LE|L\.E\.|D\.N\.I\.)\b[\s\.:]*\d{1,3}(?:[\.\s]?\d{3})*/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
    if (!limpia || limpia.length < 4) continue
    if (/^\d/.test(limpia)) continue

    // Detectar ciudad conocida embebida en la direccion
    let ciudad = null
    const cmatch = limpia.match(CIUDADES_REGEX)
    if (cmatch) {
      ciudad = normalizeCiudad(cmatch[1])
      limpia = (limpia.slice(0, cmatch.index) + " " + limpia.slice(cmatch.index + cmatch[0].length))
        .replace(/\s+/g, " ")
        .replace(/[\-\/]\s*$/, "")
        .trim()
    }
    // Si no detectamos pero hay un guion al final con palabra (ej "MITRE 1551 - TRELEW")
    if (!ciudad) {
      const cm2 = limpia.match(/\s*[\-\/]+\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s\.]+)$/)
      if (cm2) {
        ciudad = normalizeCiudad(cm2[1])
        limpia = limpia.slice(0, cm2.index).trim()
      }
    }
    // Sacar codigo postal entre parentesis "(8324)"
    const cpMatch = limpia.match(/\((\d{4,5})\)/)
    let codigoPostal = null
    if (cpMatch) {
      codigoPostal = cpMatch[1]
      limpia = limpia.replace(cpMatch[0], "").replace(/\s+/g, " ").trim()
    }
    return {
      direccion: limpia || null,
      ciudad: ciudad || null,
      codigoPostal,
    }
  }
  return { direccion: null, ciudad: null, codigoPostal: null }
}

function normalizeCiudad(raw) {
  return raw
    .replace(/\./g, ". ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
}

// Extrae fechas de vehiculos: lineas que arrancan con DD/MM/YY o D-M-Y
function extractVehiculos(body) {
  const lineas = body.split(/\r?\n/).map((l) => l.trim())
  const vehiculos = []
  for (const linea of lineas) {
    // Patrones: "09/03/22 TORNADO 0KM..." o "20-9-6 HD 125..." o "30-3-7"
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/.test(linea)) {
      vehiculos.push(linea)
    }
  }
  return vehiculos
}

// ---------- parser principal ----------

function parseFichas(texto) {
  // Normalizar separadores
  const normalizado = texto.replace(/\r\n/g, "\n")
  const lineas = normalizado.split("\n")

  const fichas = []
  let i = 0
  while (i < lineas.length) {
    // Buscar separador de inicio
    if (!DASHES.test(lineas[i])) {
      i++
      continue
    }
    // Saltar separadores consecutivos (porque vienen ----- ----- entre fichas)
    while (i < lineas.length && DASHES.test(lineas[i])) i++
    if (i >= lineas.length) break

    // La primera linea no-vacia es el nombre
    let nombreLinea = ""
    while (i < lineas.length && !lineas[i].trim()) i++
    if (i >= lineas.length) break
    nombreLinea = lineas[i].trim()
    i++

    // Saltar la linea de puntos
    while (i < lineas.length && !DOTS.test(lineas[i]) && !DASHES.test(lineas[i])) {
      // (puede no haber puntos si la ficha tiene otro formato — tomamos lo que haya)
      break
    }
    if (i < lineas.length && DOTS.test(lineas[i])) i++

    // El cuerpo va hasta el siguiente separador de guiones
    const bodyLineas = []
    while (i < lineas.length && !DASHES.test(lineas[i])) {
      bodyLineas.push(lineas[i])
      i++
    }
    const body = bodyLineas.join("\n").trim()

    if (nombreLinea) {
      fichas.push({ nombreLinea, body })
    }
  }
  return fichas
}

function fichaToCliente(ficha) {
  const { nombre, apellido } = parseNombre(ficha.nombreLinea)

  // Para extraer DNI/tel/direccion solo usamos lo que esta ANTES del primer
  // GARANTE (los datos posteriores son del garante, no del cliente).
  // El body completo se preserva en notasInternas para no perder info.
  const garanteIdx = ficha.body.search(/\b(?:GARANTE|GTE|GTES|2[º°]?\s*GTE|2[º°]?\s*GARANTE|GTE\.|GARANTE\.)\b/i)
  const cuerpoCliente = garanteIdx > 0 ? ficha.body.slice(0, garanteIdx) : ficha.body

  const dni = extractDNI(cuerpoCliente)
  const { telefono, telefonoAlt } = extractTelefonos(cuerpoCliente)
  const email = extractEmail(cuerpoCliente)
  const { direccion, ciudad, codigoPostal } = extractDireccionCiudad(cuerpoCliente)
  // Vehiculos pueden estar despues del garante, los buscamos en el body completo
  const vehiculos = extractVehiculos(ficha.body)

  // Notas internas: el body limpio (preservamos garantes y vehiculos crudos)
  const notasInternas = ficha.body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")

  return {
    nombre: nombre || "—",
    apellido: apellido || "—",
    dni,
    cuit: null,
    email,
    telefono,
    telefonoAlt,
    direccion,
    ciudad,
    provincia: null,
    codigoPostal,
    ocupacion: null,
    notasInternas,
    _vehiculos: vehiculos, // metadato para preview, no se guarda en DB
  }
}

// Dedup: por DNI primero. Si no tienen DNI, por nombre+apellido. Mergea notas y se queda con el mas completo.
function dedup(clientes) {
  const porDni = new Map()
  const porNombre = new Map()
  const finales = []
  for (const c of clientes) {
    const keyDni = c.dni
    const keyNom = `${c.apellido}|${c.nombre}`.toLowerCase()
    let existente = null
    if (keyDni && porDni.has(keyDni)) existente = porDni.get(keyDni)
    else if (!keyDni && porNombre.has(keyNom)) existente = porNombre.get(keyNom)
    if (existente) {
      // Merge: preferir valores no-null del nuevo si el existente no tiene
      for (const k of [
        "dni",
        "telefono",
        "email",
        "direccion",
        "ciudad",
        "provincia",
        "codigoPostal",
      ]) {
        if (!existente[k] && c[k]) existente[k] = c[k]
      }
      // Concatenar notas (deduplicando lineas)
      const lineasA = (existente.notasInternas || "").split("\n").filter(Boolean)
      const lineasB = (c.notasInternas || "").split("\n").filter(Boolean)
      const todasLineas = [...new Set([...lineasA, ...lineasB])]
      existente.notasInternas = todasLineas.join("\n")
      // Concatenar vehiculos
      existente._vehiculos = [...new Set([...(existente._vehiculos || []), ...c._vehiculos])]
    } else {
      finales.push(c)
      if (keyDni) porDni.set(keyDni, c)
      else porNombre.set(keyNom, c)
    }
  }
  return finales
}

// ---------- main ----------

const archivos = process.argv.slice(2)
if (archivos.length === 0) {
  console.error("Uso: node scripts/parse-cardfile.mjs file1.txt [file2.txt ...]")
  process.exit(1)
}

let todasLasFichas = []
for (const f of archivos) {
  const abs = path.resolve(f)
  if (!fs.existsSync(abs)) {
    console.error(`No encontrado: ${abs}`)
    continue
  }
  const texto = fs.readFileSync(abs, "utf8")
  const fichas = parseFichas(texto)
  console.error(`📄 ${f}: ${fichas.length} fichas`)
  todasLasFichas = todasLasFichas.concat(fichas)
}

const clientesRaw = todasLasFichas.map(fichaToCliente)

// Filtrar entradas basura: sin DNI, sin telefono, sin direccion ni vehiculos.
// Tipicamente son tests/garabatos del Cardfile original.
const clientesValidos = clientesRaw.filter((c) => {
  const tieneAlgo = c.dni || c.telefono || c.direccion || c.email
  const tieneVehiculos = c._vehiculos && c._vehiculos.length > 0
  return tieneAlgo || tieneVehiculos
})
const descartados = clientesRaw.length - clientesValidos.length
if (descartados > 0) {
  console.error(`🗑️  ${descartados} entradas basura descartadas (sin DNI/tel/dir/vehiculo)`)
}

const clientesDedup = dedup(clientesValidos)

console.error(`\n📊 Total fichas: ${clientesRaw.length}`)
console.error(`📊 Despues de dedup: ${clientesDedup.length}`)
console.error(`📊 Con DNI: ${clientesDedup.filter((c) => c.dni).length}`)
console.error(`📊 Con telefono: ${clientesDedup.filter((c) => c.telefono).length}`)
console.error(`📊 Con email: ${clientesDedup.filter((c) => c.email).length}`)
console.error(`📊 Con direccion: ${clientesDedup.filter((c) => c.direccion).length}`)
console.error(`📊 Con vehiculos: ${clientesDedup.filter((c) => c._vehiculos.length > 0).length}`)

// Quitar el metadato _vehiculos antes de imprimir el JSON final (ya esta en notas)
const final = clientesDedup.map((c) => {
  const { _vehiculos, ...resto } = c
  return resto
})

console.log(JSON.stringify(final, null, 2))

/**
 * Hornea en Cloudinary las fotos que tienen EFECTOS en la URL.
 *
 * Problema: una URL guardada como `/upload/e_upscale/.../foto.jpg` hace que
 * cada ancho/formato que pide la web genere OTRA derivada con el efecto
 * (e_upscale = super resolution, cuenta x10 créditos). Hornear = subir como
 * asset NUEVO la URL transformada que ya existe (ese derivado ya está
 * generado en la CDN, no se cobra otra SR), guardar en la base la URL limpia
 * nueva y dejar el asset viejo como estaba (no se borra nada).
 *
 * Solo toca columnas de imagen. Antes de escribir guarda un respaldo JSON
 * con las URLs viejas en docs/respaldos/.
 *
 * Uso:
 *   node --env-file=.env.local scripts/hornear-fotos-cloudinary.cjs --seco                 # solo cuenta
 *   node --env-file=.env.local scripts/hornear-fotos-cloudinary.cjs --efecto=e_upscale      # aplica
 *   node --env-file=.env.local scripts/hornear-fotos-cloudinary.cjs --efecto=e_improve --seco
 */
const fs = require("fs")
const path = require("path")
const { Client } = require("pg")
const cloudinary = require("cloudinary").v2

const SECO = process.argv.includes("--seco")
const EFECTO = (process.argv.find((a) => a.startsWith("--efecto=")) || "--efecto=e_upscale").split("=")[1]
const LIMITE = Number((process.argv.find((a) => a.startsWith("--limite=")) || "--limite=0").split("=")[1]) || 0

// [tabla, columna, esArray]
const COLUMNAS = [
  ["Modelo", "fotos", true],
  ["ModeloColor", "foto", false],
  ["Producto", "fotos", true],
  ["MandatoVenta", "fotos", true],
  ["Noticia", "imagen", false],
  ["Testimonio", "foto", false],
  ["Promocion", "imagen", false],
  ["ScheduledPost", "customFotos", true],
  ["ScheduledStory", "imageUrl", false],
  ["AdCampaignAd", "imageUrls", true],
]

const clean = (v) => (v ? v.trim().replace(/[\s\t\n\r]/g, "") : undefined)
cloudinary.config({
  cloud_name: clean(process.env.CLOUDINARY_CLOUD_NAME) || clean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) || "dgtlyzyra",
  api_key: clean(process.env.CLOUDINARY_API_KEY),
  api_secret: clean(process.env.CLOUDINARY_API_SECRET),
})

/** Devuelve la cadena de transformaciones (antes del v123/ o del public_id) o null. */
function transformDe(url) {
  const m = url.match(/\/upload\/(.+)$/)
  if (!m) return null
  const segs = m[1].split("/")
  const tr = []
  for (const s of segs) {
    if (/^v\d+$/.test(s)) break
    if (/^[a-z]{1,3}_/.test(s) || s.includes(",")) tr.push(s)
    else break
  }
  return tr.length ? tr.join("/") : null
}

function clasificar(url) {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return null
  const tr = transformDe(url)
  if (!tr) return null
  if (tr.includes("VENDIDO")) return "vendido"
  if (tr.includes("e_upscale")) return "e_upscale"
  if (tr.includes("e_background_removal")) return "e_background_removal"
  if (tr.includes("e_improve")) return "e_improve"
  if (/(^|[,/])e_/.test(tr)) return "otro_efecto"
  return "solo_transform"
}

/** public_id del asset original (sin transform, sin versión, sin extensión). */
function publicIdDe(url) {
  const rest = url.split("/upload/")[1].split("/")
  let i = 0
  while (i < rest.length && (/^[a-z]{1,3}_/.test(rest[i]) || rest[i].includes(","))) i++
  if (i < rest.length && /^v\d+$/.test(rest[i])) i++
  return rest.slice(i).join("/").replace(/\.[a-z0-9]+$/i, "")
}

async function hornear(url) {
  const pid = publicIdDe(url)
  // Asset nuevo al lado del original: <public_id>_horneada. Sin transformación
  // al subir (la URL ya trae el resultado final).
  const r = await cloudinary.uploader.upload(url, {
    public_id: `${pid}_horneada`,
    overwrite: false,
    resource_type: "image",
  })
  return r.secure_url
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const resumen = {}
  const aCambiar = [] // { tabla, columna, esArray, id, viejo, urls:[...] }
  for (const [tabla, col, arr] of COLUMNAS) {
    const q = arr
      ? `SELECT id, "${col}" AS v FROM "${tabla}" WHERE array_to_string("${col}", ' ') LIKE '%/upload/%'`
      : `SELECT id, "${col}" AS v FROM "${tabla}" WHERE "${col}" LIKE '%/upload/%'`
    let rows
    try {
      rows = (await db.query(q)).rows
    } catch (e) {
      console.log(`  (salteo ${tabla}.${col}: ${e.message})`)
      continue
    }
    for (const row of rows) {
      const urls = arr ? row.v || [] : [row.v]
      const hits = []
      for (const u of urls) {
        const c = clasificar(u)
        if (!c) continue
        const k = `${tabla}.${col}:${c}`
        resumen[k] = (resumen[k] || 0) + 1
        if (c === EFECTO) hits.push(u)
      }
      if (hits.length) aCambiar.push({ tabla, columna: col, esArray: arr, id: row.id, viejo: row.v, urls: hits })
    }
  }
  console.log("URLs con transformación guardada (tabla.columna:tipo → cantidad):")
  console.table(resumen)
  const unicas = [...new Set(aCambiar.flatMap((x) => x.urls))]
  const carpetas = {}
  for (const u of unicas) {
    const f = publicIdDe(u).split("/").slice(0, -1).join("/")
    carpetas[f] = (carpetas[f] || 0) + 1
  }
  console.log(`\nEfecto a hornear: ${EFECTO} → ${aCambiar.length} filas, ${unicas.length} URLs distintas`)
  console.table(carpetas)
  if (SECO) {
    if (unicas[0]) console.log("Ejemplo:", unicas[0])
    await db.end()
    return
  }
  if (!unicas.length) return db.end()

  // 1) Respaldo ANTES de escribir.
  const dir = path.join(__dirname, "..", "docs", "respaldos")
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const archivo = path.join(dir, `fotos-${EFECTO}-${stamp}.json`)
  fs.writeFileSync(archivo, JSON.stringify(aCambiar.map(({ urls, ...r }) => r), null, 2))
  console.log("Respaldo:", archivo)

  // 2) Hornear cada URL distinta (una sola vez).
  const mapa = {}
  const lista = LIMITE ? unicas.slice(0, LIMITE) : unicas
  for (const [i, u] of lista.entries()) {
    try {
      mapa[u] = await hornear(u)
      console.log(`  ${i + 1}/${lista.length} ok  ${mapa[u]}`)
    } catch (e) {
      console.log(`  ${i + 1}/${lista.length} ERROR ${u}: ${e.message || JSON.stringify(e)}`)
    }
  }
  fs.writeFileSync(archivo.replace(/\.json$/, "-mapa.json"), JSON.stringify(mapa, null, 2))

  // 3) Escribir SOLO la columna de imagen de cada fila afectada.
  let filas = 0
  for (const x of aCambiar) {
    const nuevo = x.esArray ? x.viejo.map((u) => mapa[u] || u) : mapa[x.viejo] || x.viejo
    if (JSON.stringify(nuevo) === JSON.stringify(x.viejo)) continue
    await db.query(`UPDATE "${x.tabla}" SET "${x.columna}" = $1 WHERE id = $2`, [nuevo, x.id])
    filas++
  }
  console.log(`\nListo: ${Object.keys(mapa).length} fotos horneadas, ${filas} filas actualizadas.`)
  await db.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

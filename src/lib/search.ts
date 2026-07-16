import {
  getModelosCatalogo,
  getProductosTienda,
  getNoticiasPublicadas,
} from "@/lib/cached-queries"

export type SearchScope = "todo" | "0km" | "disponibles" | "tienda"

export type SearchItem = {
  tipo: "0km" | "disponible" | "producto" | "noticia"
  titulo: string
  subtitulo: string
  precio: number | null
  imagen: string | null
  url: string
  score: number
}

// ---- Normalización + fuzzy (tolerante a errores de tipeo / acentos) ----

/** minúsculas, sin acentos, sólo letras/números/espacios */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Distancia de edición Damerau-Levenshtein (OSA): cuenta la transposición de
 * dos letras adyacentes como UN error (ej "hodna"→"honda"), que es el typo
 * más común. Acotada para performance.
 */
function distancia(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 2) return 99
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1) // transposición
      }
    }
  }
  return dp[m][n]
}

/**
 * Puntúa qué tan bien matchea la consulta contra un texto.
 * Semántica AND: TODAS las palabras de la consulta tienen que aparecer
 * (exactas, como substring, o con 1-2 errores de tipeo). 0 = no matchea.
 */
function puntuar(tokens: string[], texto: string): number {
  const hay = " " + texto + " "
  const palabras = texto.split(" ").filter(Boolean)
  let total = 0
  for (const t of tokens) {
    if (!t) continue
    if (hay.includes(" " + t)) {
      total += 12 // matchea al principio de una palabra (lo más relevante)
      continue
    }
    if (hay.includes(t)) {
      total += 7 // substring en el medio
      continue
    }
    // tolerancia a errores de tipeo
    let mejor = 99
    for (const w of palabras) {
      const d = distancia(t, w)
      if (d < mejor) mejor = d
    }
    const tolerancia = t.length >= 6 ? 2 : t.length >= 4 ? 1 : 0
    if (mejor <= tolerancia) {
      total += 5 - mejor
      continue
    }
    return 0 // esta palabra no matcheó en ningún lado → descartar el item
  }
  return total
}

// ---- Clasificación de motos (espejo de /disponibles) ----
type Moto = Awaited<ReturnType<typeof getModelosCatalogo>>[number]
const esCatalogo0km = (m: Moto) =>
  (m.condicion || "0KM") === "0KM" && !m.chasis?.trim() && !m.motor?.trim()

const fotoMoto = (m: Moto): string | null =>
  m.fotos?.[0] || m.colores?.find((c) => c.foto)?.foto || null

/**
 * Busca en toda la web (o en una sección) con tolerancia a errores.
 * Devuelve los resultados ordenados por relevancia.
 */
export async function buscarEnSitio(
  consulta: string,
  scope: SearchScope = "todo",
  limite = 24
): Promise<SearchItem[]> {
  const q = normalizar(consulta)
  if (q.length < 2) return []
  const tokens = q.split(" ").filter((t) => t.length >= 1)

  const [motos, productos, noticias] = await Promise.all([
    scope === "tienda" ? Promise.resolve([]) : getModelosCatalogo(),
    scope === "0km" || scope === "disponibles" ? Promise.resolve([]) : getProductosTienda(),
    scope === "todo" ? getNoticiasPublicadas() : Promise.resolve([]),
  ])

  const items: SearchItem[] = []

  for (const m of motos as Moto[]) {
    const cat0km = esCatalogo0km(m)
    if (scope === "0km" && (m.condicion || "0KM") !== "0KM") continue
    if (scope === "disponibles" && cat0km) continue
    const texto = normalizar(
      [
        m.nombre,
        m.marca,
        m.cilindrada,
        m.color,
        m.condicion === "USADA" ? "usada usado" : "0km cero km nueva",
        m.anio,
        m.combustible,
        m.tipoMotor,
      ]
        .filter(Boolean)
        .join(" ")
    )
    const score = puntuar(tokens, texto)
    if (score > 0) {
      const usada = (m.condicion || "0KM") === "USADA"
      items.push({
        tipo: usada || !cat0km ? "disponible" : "0km",
        titulo: m.nombre,
        subtitulo: [m.marca, usada ? "Usada" : "0KM", m.anio || null]
          .filter(Boolean)
          .join(" · "),
        precio: m.precio ?? null,
        imagen: fotoMoto(m),
        url: `/catalogo/${m.slug}`,
        score: score + (m.destacado ? 3 : 0),
      })
    }
  }

  for (const p of productos as Awaited<ReturnType<typeof getProductosTienda>>) {
    const texto = normalizar(
      [p.nombre, p.codigo, p.descripcion, p.motoCompatible, p.categoria?.nombre]
        .filter(Boolean)
        .join(" ")
    )
    const score = puntuar(tokens, texto)
    if (score > 0) {
      items.push({
        tipo: "producto",
        titulo: p.nombre,
        subtitulo: ["Tienda", p.categoria?.nombre].filter(Boolean).join(" · "),
        precio: p.precioOferta ?? p.precio ?? null,
        imagen: p.fotos?.[0] || null,
        url: `/tienda/${p.slug}`,
        score,
      })
    }
  }

  for (const n of noticias as Awaited<ReturnType<typeof getNoticiasPublicadas>>) {
    const texto = normalizar([n.titulo, n.resumen, n.categoria].filter(Boolean).join(" "))
    const score = puntuar(tokens, texto)
    if (score > 0) {
      items.push({
        tipo: "noticia",
        titulo: n.titulo,
        subtitulo: "Noticia",
        precio: null,
        imagen: n.imagen || null,
        url: `/noticias/${n.slug}`,
        score,
      })
    }
  }

  return items.sort((a, b) => b.score - a.score).slice(0, limite)
}

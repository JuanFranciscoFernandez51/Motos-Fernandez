import { unstable_cache, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"

// Tags base — los usamos para invalidar desde el admin cuando se edita algo.
export const CACHE_TAGS = {
  modelos: "modelos",
  modelo: (slug: string) => `modelo:${slug}`,
  productos: "productos",
  producto: (slug: string) => `producto:${slug}`,
  categorias: "categorias",
  noticias: "noticias",
  noticia: (slug: string) => `noticia:${slug}`,
  testimonios: "testimonios",
  config: "config",
} as const

// Revalidación por tiempo — fallback por si nos olvidamos un tag en el admin.
const ONE_HOUR = 60 * 60

// ==================== MODO MUNDIAL ====================

/**
 * Config crudo del Modo Mundial (cacheado). El cálculo de "activo" según fechas
 * se hace afuera con new Date() para no congelar la ventana en el cache.
 */
export const getMundialConfig = unstable_cache(
  async () => {
    return await prisma.siteConfig.findUnique({
      where: { id: "singleton" },
      select: {
        mundialActivo: true,
        mundialDesde: true,
        mundialHasta: true,
        mundialBarraEstilo: true,
        mundialConfetti: true,
        mundialConfettiNivel: true,
        promoEnvioActiva: true,
      },
    })
  },
  ["mundial-config"],
  { tags: [CACHE_TAGS.config], revalidate: 60 }
)

/** ¿Hoy cae dentro de la ventana de fechas del Mundial? (sin/con fechas) */
function dentroVentanaMundial(cfg: {
  mundialDesde?: Date | null
  mundialHasta?: Date | null
}): boolean {
  const now = new Date()
  const desdeOk = !cfg.mundialDesde || now >= cfg.mundialDesde
  const hastaOk = !cfg.mundialHasta || now <= cfg.mundialHasta
  return desdeOk && hastaOk
}

/** ¿Está activo el Modo Mundial ahora mismo? (switch + ventana de fechas) */
export async function isMundialActivo(): Promise<boolean> {
  const cfg = await getMundialConfig()
  if (!cfg?.mundialActivo) return false
  return dentroVentanaMundial(cfg)
}

/** ¿Está activa la promo "Envío gratis al Sur"? (switch + ventana del Mundial) */
export async function isPromoEnvioActiva(): Promise<boolean> {
  const cfg = await getMundialConfig()
  if (!cfg?.promoEnvioActiva) return false
  return dentroVentanaMundial(cfg)
}

// ==================== MODELOS ====================

export const getModelosDestacados = unstable_cache(
  async () => {
    try {
      return await prisma.modelo.findMany({
        where: { activo: true, vendida: false },
        orderBy: [{ destacado: "desc" }, { createdAt: "desc" }],
        take: 10,
        include: { colores: true },
      })
    } catch {
      return []
    }
  },
  ["modelos-destacados"],
  { tags: [CACHE_TAGS.modelos], revalidate: ONE_HOUR }
)

/**
 * Ordena las 0KM del home priorizando BMW (mayormente, ~2 por página de 5) pero
 * intercalando TODAS las marcas para que no quede agrupado por una sola (antes
 * dominaba Yamaha/Kawasaki). El resto de marcas va en round-robin (una de cada
 * marca por vuelta) para máxima variedad.
 */
function ordenar0kmHome<T extends { marca: string | null }>(pool: T[]): T[] {
  const esBmw = (m: T) => (m.marca || "").trim().toUpperCase() === "BMW"
  const bmw = pool.filter(esBmw)
  const otros = pool.filter((m) => !esBmw(m))

  // Round-robin de las otras marcas (una de cada marca por vuelta).
  const grupos = new Map<string, T[]>()
  for (const m of otros) {
    const k = (m.marca || "?").trim()
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(m)
  }
  const marcas = [...grupos.keys()]
  const otrosRR: T[] = []
  let quedan = true
  while (quedan) {
    quedan = false
    for (const b of marcas) {
      const g = grupos.get(b)!
      if (g.length) {
        otrosRR.push(g.shift()!)
        quedan = true
      }
    }
  }

  // Intercalar por "página" de 5: 2 BMW + 3 de las otras (round-robin).
  const result: T[] = []
  let bi = 0
  let oi = 0
  while (bi < bmw.length || oi < otrosRR.length) {
    for (let k = 0; k < 2 && bi < bmw.length; k++) result.push(bmw[bi++])
    for (let k = 0; k < 3 && oi < otrosRR.length; k++) result.push(otrosRR[oi++])
  }
  return result
}

/**
 * Para el home: trae las destacadas como fijas (primera fila) y un set
 * más amplio de motos para rotar en la segunda fila.
 */
export const getModelosHome = unstable_cache(
  async () => {
    try {
      // Traemos un lote por separado de usadas y de 0KM (sin destacar) para que
      // AMBAS filas del home tengan suficientes unidades para rotar. Si se
      // mezclaran en una sola query, las 0KM (muchas más) tapan a las usadas.
      const [destacadas, rotUsadas, rot0km] = await Promise.all([
        prisma.modelo.findMany({
          where: { activo: true, vendida: false, destacado: true },
          orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
          take: 5,
        }),
        prisma.modelo.findMany({
          where: { activo: true, vendida: false, destacado: false, condicion: "USADA" },
          orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
          take: 25,
        }),
        prisma.modelo.findMany({
          where: { activo: true, vendida: false, destacado: false, condicion: { not: "USADA" } },
          orderBy: [{ orden: "asc" }, { createdAt: "desc" }],
          take: 120,
        }),
      ])
      // Diversificar las 0KM (mayormente BMW + todas las marcas intercaladas).
      const rot0kmOrdenadas = ordenar0kmHome(rot0km).slice(0, 35)
      return { destacadas, rotativas: [...rotUsadas, ...rot0kmOrdenadas] }
    } catch {
      return { destacadas: [], rotativas: [] }
    }
  },
  ["modelos-home"],
  { tags: [CACHE_TAGS.modelos], revalidate: ONE_HOUR }
)

export const getModelosCatalogo = unstable_cache(
  async () => {
    try {
      return await prisma.modelo.findMany({
        where: { activo: true, vendida: false },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        include: { colores: true },
      })
    } catch {
      return []
    }
  },
  ["modelos-catalogo"],
  { tags: [CACHE_TAGS.modelos], revalidate: ONE_HOUR }
)

export const getMarcasCatalogo = unstable_cache(
  async () => {
    try {
      const brands = await prisma.modelo.findMany({
        where: { activo: true, vendida: false },
        select: { marca: true },
        distinct: ["marca"],
        orderBy: { marca: "asc" },
      })
      return brands.map((b) => b.marca)
    } catch {
      return []
    }
  },
  ["marcas-catalogo"],
  { tags: [CACHE_TAGS.modelos], revalidate: ONE_HOUR }
)

export const getModeloBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      try {
        return await prisma.modelo.findFirst({
          where: { slug, activo: true, vendida: false },
          include: { colores: true },
        })
      } catch {
        return null
      }
    },
    ["modelo-by-slug", slug],
    { tags: [CACHE_TAGS.modelos, CACHE_TAGS.modelo(slug)], revalidate: ONE_HOUR }
  )()

export const getModelosRelacionados = (categoria: string, excludeId: string) =>
  unstable_cache(
    async () => {
      try {
        return await prisma.modelo.findMany({
          where: {
            activo: true,
            vendida: false,
            categoriaVehiculo: categoria as never,
            id: { not: excludeId },
          },
          take: 4,
          orderBy: { orden: "asc" },
        })
      } catch {
        return []
      }
    },
    ["modelos-relacionados", categoria, excludeId],
    { tags: [CACHE_TAGS.modelos], revalidate: ONE_HOUR }
  )()

// ==================== PRODUCTOS (TIENDA) ====================

export const getProductosTienda = unstable_cache(
  async () => {
    try {
      return await prisma.producto.findMany({
        where: { activo: true },
        include: { categoria: true },
        orderBy: { createdAt: "desc" },
      })
    } catch {
      return []
    }
  },
  ["productos-tienda"],
  { tags: [CACHE_TAGS.productos], revalidate: ONE_HOUR }
)

export const getCategoriasTienda = unstable_cache(
  async () => {
    try {
      return await prisma.categoria.findMany({
        orderBy: { orden: "asc" },
        include: { _count: { select: { productos: { where: { activo: true } } } } },
      })
    } catch {
      return []
    }
  },
  ["categorias-tienda"],
  { tags: [CACHE_TAGS.categorias, CACHE_TAGS.productos], revalidate: ONE_HOUR }
)

export const getProductoBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      try {
        return await prisma.producto.findUnique({
          where: { slug },
          include: { categoria: true },
        })
      } catch {
        return null
      }
    },
    ["producto-by-slug", slug],
    { tags: [CACHE_TAGS.productos, CACHE_TAGS.producto(slug)], revalidate: ONE_HOUR }
  )()

export const getProductosRelacionados = (categoriaId: string, excludeId: string) =>
  unstable_cache(
    async () => {
      try {
        return await prisma.producto.findMany({
          where: { categoriaId, activo: true, id: { not: excludeId } },
          take: 4,
          include: { categoria: true },
        })
      } catch {
        return []
      }
    },
    ["productos-relacionados", categoriaId, excludeId],
    { tags: [CACHE_TAGS.productos], revalidate: ONE_HOUR }
  )()

// ==================== NOTICIAS ====================

export const getNoticiasRecientes = unstable_cache(
  async () => {
    try {
      return await prisma.noticia.findMany({
        where: { publicado: true },
        orderBy: { fechaPublicacion: "desc" },
        take: 3,
        select: {
          id: true,
          titulo: true,
          slug: true,
          resumen: true,
          imagen: true,
          categoria: true,
          fechaPublicacion: true,
        },
      })
    } catch {
      return []
    }
  },
  ["noticias-recientes"],
  { tags: [CACHE_TAGS.noticias], revalidate: ONE_HOUR }
)

export const getNoticiasPublicadas = unstable_cache(
  async () => {
    try {
      return await prisma.noticia.findMany({
        where: { publicado: true },
        orderBy: { fechaPublicacion: "desc" },
      })
    } catch {
      return []
    }
  },
  ["noticias-publicadas"],
  { tags: [CACHE_TAGS.noticias], revalidate: ONE_HOUR }
)

export const getNoticiaBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      try {
        return await prisma.noticia.findFirst({
          where: { slug, publicado: true },
        })
      } catch {
        return null
      }
    },
    ["noticia-by-slug", slug],
    { tags: [CACHE_TAGS.noticias, CACHE_TAGS.noticia(slug)], revalidate: ONE_HOUR }
  )()

export const getNoticiasRelacionadas = (categoria: string | null, excludeId: string) =>
  unstable_cache(
    async () => {
      if (!categoria) return []
      try {
        return await prisma.noticia.findMany({
          where: {
            publicado: true,
            categoria,
            id: { not: excludeId },
          },
          orderBy: { fechaPublicacion: "desc" },
          take: 3,
        })
      } catch {
        return []
      }
    },
    ["noticias-relacionadas", categoria ?? "_", excludeId],
    { tags: [CACHE_TAGS.noticias], revalidate: ONE_HOUR }
  )()

// ==================== TESTIMONIOS ====================

export const getTestimoniosHome = unstable_cache(
  async () => {
    try {
      return await prisma.testimonio.findMany({
        where: { publicado: true },
        orderBy: [{ destacado: "desc" }, { orden: "asc" }, { createdAt: "desc" }],
        take: 6,
      })
    } catch {
      return []
    }
  },
  ["testimonios-home"],
  { tags: [CACHE_TAGS.testimonios], revalidate: ONE_HOUR }
)

// ==================== INVALIDACIÓN ====================

export function invalidateModelos(slug?: string) {
  revalidateTag(CACHE_TAGS.modelos, "max")
  if (slug) revalidateTag(CACHE_TAGS.modelo(slug), "max")
}

export function invalidateProductos(slug?: string) {
  revalidateTag(CACHE_TAGS.productos, "max")
  if (slug) revalidateTag(CACHE_TAGS.producto(slug), "max")
}

export function invalidateCategorias() {
  revalidateTag(CACHE_TAGS.categorias, "max")
  revalidateTag(CACHE_TAGS.productos, "max")
}

export function invalidateNoticias(slug?: string) {
  revalidateTag(CACHE_TAGS.noticias, "max")
  if (slug) revalidateTag(CACHE_TAGS.noticia(slug), "max")
}

export function invalidateTestimonios() {
  revalidateTag(CACHE_TAGS.testimonios, "max")
}

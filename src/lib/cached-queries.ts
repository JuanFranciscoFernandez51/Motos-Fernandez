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
} as const

// Revalidación por tiempo — fallback por si nos olvidamos un tag en el admin.
const ONE_HOUR = 60 * 60

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

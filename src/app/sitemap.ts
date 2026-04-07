import { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://motosfernandez.com.ar"

  // Rutas estáticas
  const staticRoutes = [
    "/",
    "/modelos",
    "/tienda",
    "/financiacion",
    "/nosotros",
    "/contacto",
    "/servicio-tecnico",
    "/noticias",
  ]

  // Modelos dinámicos
  const modelos = await prisma.modelo.findMany({
    where: { activo: true },
    select: { slug: true, updatedAt: true },
  })

  // Productos dinámicos
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { slug: true, updatedAt: true },
  })

  // Noticias
  const noticias = await prisma.noticia.findMany({
    where: { publicado: true },
    select: { slug: true, updatedAt: true },
  })

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "/" ? 1 : 0.8,
    })),
    ...modelos.map((m) => ({
      url: `${baseUrl}/modelos/${m.slug}`,
      lastModified: m.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...productos.map((p) => ({
      url: `${baseUrl}/tienda/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...noticias.map((n) => ({
      url: `${baseUrl}/noticias/${n.slug}`,
      lastModified: n.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}

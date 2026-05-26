import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSection } from "@/lib/admin-auth"
import { CalendarioClient } from "./calendario-client"

export const dynamic = "force-dynamic"

export default async function CalendarioMetaPage() {
  const session = await requireSection("META")
  if (!session) redirect("/admin")

  // Trae motos disponibles para programar (activas para marketing, no
  // vendidas, con al menos una foto). Pasamos solo lo necesario al cliente.
  const motos = await prisma.modelo.findMany({
    where: {
      activeForMarketing: true,
      vendida: false,
      fotos: { isEmpty: false },
    },
    orderBy: [{ marca: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      slug: true,
      marca: true,
      nombre: true,
      anio: true,
      condicion: true,
      precio: true,
      moneda: true,
      fotos: true,
    },
  })

  // Posts programados: futuros + recientes para tener contexto. Históricos
  // viejos no los traemos.
  const desde = new Date()
  desde.setDate(desde.getDate() - 7) // últimos 7 días + futuro
  const posts = await prisma.scheduledPost.findMany({
    where: {
      OR: [
        { scheduledAt: { gte: desde } },
        { status: { in: ["PENDING", "PROCESSING"] } },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      moto: {
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          fotos: true,
        },
      },
    },
  })

  const featureEnabled =
    process.env.FEATURE_SCHEDULED_POSTS_ENABLED === "true"

  return (
    <CalendarioClient
      motos={motos.map((m) => ({
        id: m.id,
        slug: m.slug,
        marca: m.marca,
        nombre: m.nombre,
        anio: m.anio,
        condicion: m.condicion || "0KM",
        precio: m.precio,
        moneda: m.moneda,
        fotoPrincipal: m.fotos[0] || null,
      }))}
      posts={posts.map((p) => ({
        id: p.id,
        status: p.status,
        platforms: p.platforms,
        scheduledAt: p.scheduledAt.toISOString(),
        publishedAt: p.publishedAt?.toISOString() || null,
        customCaption: p.customCaption,
        errorMessage: p.errorMessage,
        retryCount: p.retryCount,
        publishedRefs: p.publishedRefs as Record<string, unknown> | null,
        moto: {
          id: p.moto.id,
          slug: p.moto.slug,
          marca: p.moto.marca,
          nombre: p.moto.nombre,
          fotoPrincipal: p.moto.fotos[0] || null,
        },
      }))}
      featureEnabled={featureEnabled}
    />
  )
}

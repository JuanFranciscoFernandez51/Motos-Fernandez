// Helpers para publicar/actualizar/despublicar motos en Mercado Libre.
import { prisma } from "@/lib/prisma"
import { mlGet, mlPost, mlPut } from "./client"

// Categoría de Motos en MLA (Argentina): MLA1747 (Motos)
// Para subcategorías ML tiene un endpoint /sites/MLA/category_predictor/predict
// que dado un título te sugiere la categoría más específica.

type CategoryPrediction = {
  id: string
  name: string
  shipping_modes?: string[]
}

async function predecirCategoria(titulo: string): Promise<string> {
  // Intento 1: domain_discovery/search (mas moderno, devuelve array)
  try {
    const r = await mlGet<unknown>(
      `/sites/MLA/domain_discovery/search?limit=1&q=${encodeURIComponent(titulo)}`
    )
    if (Array.isArray(r) && r.length > 0) {
      const first = r[0] as { category_id?: string; id?: string }
      const id = first.category_id || first.id
      if (id && typeof id === "string") return id
    }
  } catch (e) {
    console.warn("[ML] domain_discovery/search falló:", e)
  }
  // Intento 2: category_predictor/predict (legacy pero estable)
  try {
    const r = await mlGet<CategoryPrediction>(
      `/sites/MLA/category_predictor/predict?title=${encodeURIComponent(titulo)}`
    )
    if (r?.id) return r.id
  } catch (e) {
    console.warn("[ML] category_predictor falló:", e)
  }
  // Fallback: Motos Calle 451+ cc, una de las más usadas. ML lo acepta.
  return "MLA418082"
}

type ModeloParaML = {
  id: string
  nombre: string
  marca: string
  anio: number | null
  kilometros: number | null
  condicion: string
  cilindrada: string | null
  precio: number | null
  moneda: string
  descripcion: string | null
  fotos: string[]
}

/**
 * Publica una moto en Mercado Libre. Devuelve el listingId (MLA...).
 * Si ya está publicada (mlListingId existente), actualiza en lugar de crear.
 */
export async function publicarOActualizar(modeloId: string): Promise<{
  ok: boolean
  listingId?: string
  permalink?: string
  error?: string
}> {
  const m = await prisma.modelo.findUnique({
    where: { id: modeloId },
    select: {
      id: true, nombre: true, marca: true, anio: true, kilometros: true,
      condicion: true, cilindrada: true, precio: true, moneda: true,
      descripcion: true, fotos: true,
      transmision: true, combustible: true, color: true,
      mlListingId: true,
    },
  })
  if (!m) return { ok: false, error: "Moto no encontrada" }
  if (!m.precio) return { ok: false, error: "La moto no tiene precio cargado" }
  if (m.fotos.length === 0) return { ok: false, error: "La moto no tiene fotos" }

  const titulo = `${m.marca} ${m.nombre}${m.anio ? ` ${m.anio}` : ""}`.slice(0, 60)

  try {
    // Si ya existe la publicación, hacemos UPDATE
    if (m.mlListingId) {
      const update = await mlPut<{ id: string; permalink: string; status: string }>(
        `/items/${m.mlListingId}`,
        {
          price: m.precio,
          // available_quantity: 1 (motos son piezas únicas; se infiere)
          // Para cambiar fotos, ML requiere endpoint diferente; lo dejamos para futuro
        }
      )
      // Actualizar descripción si cambió
      if (m.descripcion) {
        await mlPut(`/items/${m.mlListingId}/description`, {
          plain_text: m.descripcion.slice(0, 50000),
        }).catch(() => null)
      }
      await prisma.modelo.update({
        where: { id: m.id },
        data: {
          mlEstado: update.status,
          mlPermalink: update.permalink,
          mlUltimaSync: new Date(),
          mlError: null,
        },
      })
      return { ok: true, listingId: update.id, permalink: update.permalink }
    }

    // Sino: CREAR publicación nueva
    const categoryId = await predecirCategoria(titulo)
    const condition = m.condicion === "0KM" ? "new" : "used"

    // family_name: agrupador de productos similares en ML (requerido en v2).
    // Ej: para "Honda CRF 250 Rally 2017" -> family_name = "Honda CRF 250 Rally"
    const familyName = `${m.marca} ${m.nombre}`.slice(0, 60)

    // Filtrar fotos: solo URLs públicas absolutas (ML necesita poder descargarlas).
    // Saca el placeholder /images/logo-clasico.png y cualquier otra ruta relativa.
    const fotosPublicas = m.fotos
      .filter((url) => /^https?:\/\//i.test(url))
      .slice(0, 12)

    if (fotosPublicas.length === 0) {
      return { ok: false, error: "La moto no tiene fotos con URL pública (Cloudinary)" }
    }

    const body = {
      title: titulo,
      family_name: familyName,
      category_id: categoryId,
      price: m.precio,
      currency_id: m.moneda === "USD" ? "USD" : "ARS",
      available_quantity: 1,
      buying_mode: "buy_it_now",
      listing_type_id: "gold_special", // Clásica gratis. Otros: "gold_pro" (Premium pago)
      condition,
      pictures: fotosPublicas.map((url) => ({ source: url })),
      attributes: [
        { id: "BRAND", value_name: m.marca },
        { id: "MODEL", value_name: m.nombre },
        { id: "ITEM_CONDITION", value_name: condition === "new" ? "Nuevo" : "Usado" },
        ...(m.anio ? [{ id: "VEHICLE_YEAR", value_name: String(m.anio) }] : []),
        ...(m.kilometros != null
          ? [{ id: "KILOMETERS", value_struct: { number: m.kilometros, unit: "km" } }]
          : []),
        ...(m.cilindrada
          ? [{ id: "ENGINE_DISPLACEMENT", value_name: m.cilindrada }]
          : []),
        ...(m.transmision ? [{ id: "TRANSMISSION", value_name: m.transmision }] : []),
        ...(m.combustible ? [{ id: "FUEL_TYPE", value_name: m.combustible }] : []),
        ...(m.color ? [{ id: "COLOR", value_name: m.color }] : []),
      ],
    }

    const created = await mlPost<{ id: string; permalink: string; status: string }>(
      "/items",
      body
    )
    // Crear descripción
    if (m.descripcion) {
      await mlPost(`/items/${created.id}/description`, {
        plain_text: m.descripcion.slice(0, 50000),
      }).catch(() => null)
    }
    await prisma.modelo.update({
      where: { id: m.id },
      data: {
        mlListingId: created.id,
        mlPermalink: created.permalink,
        mlEstado: created.status,
        mlUltimaSync: new Date(),
        mlError: null,
      },
    })
    return { ok: true, listingId: created.id, permalink: created.permalink }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    await prisma.modelo
      .update({
        where: { id: m.id },
        data: { mlError: msg.slice(0, 500), mlUltimaSync: new Date() },
      })
      .catch(() => null)
    return { ok: false, error: msg }
  }
}

/**
 * Pausa la publicación (status=paused) en ML.
 */
export async function pausarPublicacion(modeloId: string) {
  const m = await prisma.modelo.findUnique({ where: { id: modeloId } })
  if (!m?.mlListingId) return { ok: false, error: "No tiene publicación en ML" }
  try {
    const r = await mlPut<{ status: string }>(`/items/${m.mlListingId}`, {
      status: "paused",
    })
    await prisma.modelo.update({
      where: { id: modeloId },
      data: { mlEstado: r.status, mlUltimaSync: new Date(), mlError: null },
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" }
  }
}

/**
 * Cierra (despublica) la publicación. status=closed.
 */
export async function cerrarPublicacion(modeloId: string) {
  const m = await prisma.modelo.findUnique({ where: { id: modeloId } })
  if (!m?.mlListingId) return { ok: false, error: "No tiene publicación en ML" }
  try {
    const r = await mlPut<{ status: string }>(`/items/${m.mlListingId}`, {
      status: "closed",
    })
    await prisma.modelo.update({
      where: { id: modeloId },
      data: { mlEstado: r.status, mlUltimaSync: new Date(), mlError: null },
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" }
  }
}

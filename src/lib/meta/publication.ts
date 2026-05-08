// Publica una moto del catalogo en Instagram (carrusel) + Facebook (foto).
//
// Doc IG carrusel:
//   https://developers.facebook.com/docs/instagram-api/guides/content-publishing#carousels
// Flujo:
//   1) Por cada foto: POST /{ig-user-id}/media con image_url + is_carousel_item=true → creation_id
//   2) POST /{ig-user-id}/media con media_type=CAROUSEL + children=[creation_ids] + caption → carousel_creation_id
//   3) POST /{ig-user-id}/media_publish con creation_id=carousel_creation_id → post final
//
// Doc FB Page foto:
//   https://developers.facebook.com/docs/graph-api/reference/page/photos
//   POST /{page-id}/photos con url + caption + published=true
import { prisma } from "@/lib/prisma"
import { metaPost, metaGet } from "./client"
import Anthropic from "@anthropic-ai/sdk"
import { BUSINESS } from "@/lib/constants"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Cloudinary: forzar JPG cuadrado de calidad media para que IG lo acepte.
// IG quiere fotos en aspect ratios entre 4:5 y 1.91:1. Lo más seguro es 1:1.
function urlIG(url: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url
  return url.replace(
    /\/upload\//,
    "/upload/f_jpg,q_auto:good,w_1080,h_1080,c_fill,g_auto/"
  )
}

async function generarCaption(moto: {
  marca: string
  nombre: string
  anio: number | null
  cilindrada: string | null
  condicion: string
  precio: number | null
  moneda: string
  kilometros: number | null
  potenciaHp: number | null
}): Promise<string> {
  const titulo = `${moto.marca} ${moto.nombre}${moto.anio ? ` ${moto.anio}` : ""}`
  const condicion = moto.condicion === "0KM" ? "0 km a estrenar" : "usada"
  const km =
    moto.kilometros != null ? `${moto.kilometros.toLocaleString("es-AR")} km` : ""
  const precio =
    moto.precio != null
      ? `${moto.moneda === "USD" ? "USD " : "$"}${moto.precio.toLocaleString("es-AR")}`
      : null

  const prompt = `Sos copywriter para Instagram de una concesionaria de motos en Bahía Blanca, Argentina.

MOTO: ${titulo}
Condición: ${condicion}${km ? ` (${km})` : ""}
Cilindrada: ${moto.cilindrada || "—"}
Potencia: ${moto.potenciaHp ? moto.potenciaHp + " HP" : "—"}
Precio: ${precio || "consultar"}

Generá un caption para Instagram. ESTRUCTURA EXACTA:

Línea 1: hook con emoji al inicio, máx 8 palabras (ej "🏁 Llega la nueva XXX")
Línea 2: en blanco
Líneas 3-5: descripción seductora (2-3 oraciones cortas, mencioná specs clave traducidas a beneficios)
Línea 6: en blanco
Línea 7: precio + cuotas (ej "💰 Desde ${precio || "$consultar"} | 36 cuotas")
Línea 8: en blanco
Línea 9: CTA con emoji (ej "📲 Consultanos por WhatsApp +54 9 291 578 8671")
Línea 10: en blanco
Línea 11: hashtags (8-12 hashtags relevantes en una sola línea)

REGLAS:
- Tono: argentino informal pero profesional, vos en lugar de tú
- Usá emojis pero sin exagerar (max 1 por línea)
- Hashtags relevantes: marca de la moto, modelo, tipo (#enduro/#deportiva/etc), #motos, #bahiablanca, #motosfernandez, #motosbahia
- NO inventes specs que no te di
- Total: máximo 200 palabras

Devolvé SOLO el caption, sin comentarios ni comillas envolventes.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  })
  const block = response.content[0]
  if (block.type !== "text") throw new Error("Respuesta IA inválida")
  return block.text.trim().replace(/^["']|["']$/g, "")
}

type IGMediaResponse = { id: string }
type IGPostResponse = { id: string; permalink?: string }
type FBPhotoResponse = { id: string; post_id?: string }
type IGMediaStatus = { status_code?: string; status?: string }

/**
 * Espera a que un container de IG (foto carousel item o carusel completo)
 * esté en estado FINISHED antes de seguir. IG procesa el upload async, y
 * si llamamos a media_publish antes de FINISHED tira "Media ID is not available".
 */
async function esperarMediaListo(
  creationId: string,
  timeoutMs = 60000
): Promise<void> {
  const inicio = Date.now()
  while (Date.now() - inicio < timeoutMs) {
    const r = await metaGet<IGMediaStatus>(
      `/${creationId}?fields=status_code,status`
    )
    const code = r.status_code || r.status
    if (code === "FINISHED") return
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(
        `IG rechazó el media ${creationId}: status=${code} (revisá que la foto sea JPG válido y aspect ratio entre 4:5 y 1.91:1)`
      )
    }
    // IN_PROGRESS o cualquier otro → seguir esperando
    await new Promise((res) => setTimeout(res, 2000))
  }
  throw new Error(
    `IG tardó más de ${timeoutMs / 1000}s en procesar el media ${creationId}`
  )
}

/**
 * Publica una moto en Instagram (carrusel) + cross-post a Facebook Page.
 * Si la moto ya fue publicada antes (igPostId existente), no la repite a
 * menos que se pase forceRepublish=true (cierra la vieja y crea una nueva).
 */
export async function publicarEnMeta(
  modeloId: string,
  options: { forceRepublish?: boolean } = {}
): Promise<{
  ok: boolean
  igPostId?: string
  igPermalink?: string
  fbPostId?: string
  error?: string
}> {
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageAccessToken || !cfg.igUserId || !cfg.pageId) {
    return { ok: false, error: "Meta no está conectado" }
  }

  const m = await prisma.modelo.findUnique({
    where: { id: modeloId },
    select: {
      id: true,
      marca: true,
      nombre: true,
      anio: true,
      cilindrada: true,
      condicion: true,
      precio: true,
      moneda: true,
      kilometros: true,
      potenciaHp: true,
      fotos: true,
      igPostId: true,
    },
  })
  if (!m) return { ok: false, error: "Moto no encontrada" }
  if (!options.forceRepublish && m.igPostId) {
    return { ok: false, error: `Ya está publicada (post ${m.igPostId})` }
  }
  if (m.fotos.length === 0) {
    return { ok: false, error: "La moto no tiene fotos" }
  }

  // Filtrar fotos a URLs HTTPS públicas y limitar a 10 (max IG carrusel)
  const fotos = m.fotos
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 10)
    .map(urlIG)
  if (fotos.length === 0) {
    return {
      ok: false,
      error: "La moto no tiene fotos con URL pública (subí fotos a Cloudinary)",
    }
  }

  try {
    const caption = await generarCaption(m).catch(
      () => `${m.marca} ${m.nombre}${m.anio ? ` ${m.anio}` : ""}`
    )

    // 1) Subir cada foto como carousel_item → recibimos creation_ids
    const creationIds: string[] = []
    for (const url of fotos) {
      const r = await metaPost<IGMediaResponse>(`/${cfg.igUserId}/media`, {
        image_url: url,
        is_carousel_item: true,
      })
      if (!r.id) throw new Error("IG respondió sin id de media")
      creationIds.push(r.id)
      // Pausa breve para no saturar IG
      await new Promise((res) => setTimeout(res, 400))
    }

    // 1b) Esperar que cada item carousel esté FINISHED (IG los procesa
    //     async — si no, "Media ID is not available" al publicar).
    for (const id of creationIds) {
      await esperarMediaListo(id, 30000)
    }

    // 2) Crear el contenedor del carrusel
    const carousel = await metaPost<IGMediaResponse>(`/${cfg.igUserId}/media`, {
      media_type: "CAROUSEL",
      children: creationIds.join(","),
      caption,
    })

    // 2b) También esperar el container de carrusel
    await esperarMediaListo(carousel.id, 60000)

    // 3) Publicar
    const published = await metaPost<IGPostResponse>(
      `/${cfg.igUserId}/media_publish`,
      { creation_id: carousel.id }
    )

    // Obtener permalink del post recién publicado
    let permalink: string | undefined
    try {
      const info = await metaGet<{ permalink: string }>(
        `/${published.id}?fields=permalink`
      )
      permalink = info.permalink
    } catch {
      // si falla, no rompemos
    }

    // 4) Cross-post a Facebook Page (foto principal con caption)
    let fbPostId: string | undefined
    try {
      const fb = await metaPost<FBPhotoResponse>(`/${cfg.pageId}/photos`, {
        url: fotos[0],
        caption,
        published: true,
      })
      fbPostId = fb.post_id || fb.id
    } catch (e) {
      console.warn("[Meta] Cross-post a FB falló:", e)
    }

    await prisma.modelo.update({
      where: { id: m.id },
      data: {
        igPostId: published.id,
        igPermalink: permalink,
        fbPostId,
        fbPermalink: fbPostId
          ? `https://www.facebook.com/${fbPostId}`
          : null,
        igUltimaSync: new Date(),
        igError: null,
      },
    })

    return {
      ok: true,
      igPostId: published.id,
      igPermalink: permalink,
      fbPostId,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    await prisma.modelo
      .update({
        where: { id: m.id },
        data: { igError: msg.slice(0, 1000), igUltimaSync: new Date() },
      })
      .catch(() => null)
    return { ok: false, error: msg }
  }
}

/**
 * Limpia los igError de las motos que fallaron antes (no afecta los posts
 * existentes en IG/FB).
 */
export async function limpiarErroresMeta() {
  const r = await prisma.modelo.updateMany({
    where: { igError: { not: null } },
    data: { igError: null },
  })
  return { ok: true, limpiados: r.count }
}

// Datos del negocio para sumar al final del caption (no los usa el caption
// IA porque las cuentas serias no espamean datos en cada post). Lo dejamos
// disponible por si en el futuro queremos un bloque opcional.
export const META_BUSINESS_FOOTER = `\n\n${BUSINESS.address}\nWhatsApp ${BUSINESS.whatsappDisplay}\n${BUSINESS.email}`

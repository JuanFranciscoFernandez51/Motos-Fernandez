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
import { BUSINESS } from "@/lib/constants"

// Cloudinary: forzar JPG cuadrado de calidad media para que IG lo acepte.
// IG quiere fotos en aspect ratios entre 4:5 y 1.91:1. Lo más seguro es 1:1.
function urlIG(url: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url
  return url.replace(
    /\/upload\//,
    "/upload/f_jpg,q_auto:good,w_1080,h_1080,c_fill,g_auto/"
  )
}

type MotoCaption = {
  marca: string
  nombre: string
  anio: number | null
  condicion: string
  precio: number | null
  moneda: string
  kilometros: number | null
}

/** Genera hashtags específicos para la moto. */
function generarHashtags(moto: MotoCaption): string[] {
  const slug = (s: string) =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "")
  const tags = new Set<string>([
    "motosfernandez",
    "motosbahia",
    "bahiablanca",
    "motos",
    "motoargentina",
  ])
  if (moto.marca) tags.add(slug(moto.marca))
  if (moto.nombre) tags.add(slug(moto.marca + moto.nombre).slice(0, 30))
  if (moto.condicion === "0KM") tags.add("0km")
  return Array.from(tags).slice(0, 12).map((t) => "#" + t)
}

/**
 * Arma el caption con estructura fija minimal: solo titulo, datos
 * basicos (marca/modelo/año/km), precio, datos del negocio y hashtags.
 * Sin descripcion IA ni ficha tecnica — Francisco prefiere asi.
 */
function generarCaption(moto: MotoCaption): string {
  const titulo = `${moto.marca} ${moto.nombre}${moto.anio ? ` ${moto.anio}` : ""}`
  const precio =
    moto.precio != null
      ? `${moto.moneda === "USD" ? "USD " : "$"}${moto.precio.toLocaleString("es-AR")}`
      : "Consultar"
  const km =
    moto.kilometros != null
      ? moto.kilometros.toLocaleString("es-AR") + " km"
      : moto.condicion === "0KM"
        ? "0 km (a estrenar)"
        : "—"

  const hashtags = generarHashtags(moto).join(" ")

  return [
    `🏁 ${titulo}`,
    "",
    `• Marca: ${moto.marca}`,
    `• Modelo: ${moto.nombre}`,
    ...(moto.anio ? [`• Año: ${moto.anio}`] : []),
    `• Kilómetros: ${km}`,
    "",
    `💰 Precio: ${precio}`,
    "💳 Hasta 24 cuotas | Aceptamos tu moto en parte de pago",
    "━━━━━━━━━━━━━━━",
    "📍 MOTOS FERNÁNDEZ",
    "Brown 1052, Bahía Blanca",
    "📞 WhatsApp +54 9 291 578 8671",
    "🕐 Lunes a Viernes de 9 a 17 hs",
    "🌐 motosfernandez.com.ar",
    hashtags,
  ].join("\n")
}

type IGMediaResponse = { id: string }
type IGPostResponse = { id: string; permalink?: string }
type FBPhotoResponse = { id: string; post_id?: string }
type IGMediaStatus = { status_code?: string; status?: string }

/**
 * Espera a que un container de IG (foto carousel item o carusel completo)
 * esté en estado FINISHED antes de seguir. IG procesa el upload async, y
 * si llamamos a media_publish antes de FINISHED tira "Media ID is not available".
 *
 * Si el container queda inválido (subcode 33 = "no existe / sin permiso")
 * casi siempre es porque IG rechazó la foto al cargarla (URL inaccesible,
 * formato no JPG, aspect ratio fuera de rango).
 *
 * IMPORTANTE: los campos válidos del container de IG son SOLO
 * `status_code` y `status`. `error_message` NO existe como field y
 * pedirlo hace que Meta rebote con "(#100) Tried accessing nonexisting
 * field (error_message)" — lo que rompía TODA publicación a IG. El
 * detalle del error, cuando lo hay, viene dentro del string `status`.
 */
async function esperarMediaListo(
  creationId: string,
  timeoutMs = 60000,
  contextoFoto?: string
): Promise<void> {
  const inicio = Date.now()
  const ctx = contextoFoto ? ` (foto: ${contextoFoto})` : ""
  while (Date.now() - inicio < timeoutMs) {
    try {
      const r = await metaGet<IGMediaStatus>(
        `/${creationId}?fields=status_code,status`
      )
      const code = r.status_code || r.status
      if (code === "FINISHED") return
      if (typeof code === "string" && (code.includes("ERROR") || code.includes("EXPIRED"))) {
        // El string `status` suele traer el detalle (ej:
        // "ERROR: The media ... aspect ratio ...").
        const detalle = r.status && r.status !== code ? ` — ${r.status}` : ""
        throw new Error(
          `IG rechazó el media ${creationId}${ctx}: ${code}${detalle}. Causas comunes: aspect ratio fuera de 4:5 a 1.91:1, foto no es JPG, URL inaccesible.`
        )
      }
      await new Promise((res) => setTimeout(res, 2000))
    } catch (e) {
      // Si el container "no existe" (subcode 33), IG ya lo descartó por
      // foto rechazada. Damos error con la URL específica si la tenemos.
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("subcode") && msg.includes("33")) {
        throw new Error(
          `IG descartó el media ${creationId}${ctx} porque rechazó la foto al cargarla. Probá: 1) que la foto sea JPG (no PNG/WEBP/HEIC), 2) aspect ratio entre 4:5 vertical y 1.91:1 horizontal, 3) que la URL sea pública (probala en incógnito).`
        )
      }
      throw e
    }
  }
  throw new Error(
    `IG tardó más de ${timeoutMs / 1000}s en procesar el media ${creationId}${ctx}`
  )
}

/**
 * Publica una moto en Instagram (carrusel) + cross-post a Facebook Page.
 * Si la moto ya fue publicada antes (igPostId existente), no la repite a
 * menos que se pase forceRepublish=true (cierra la vieja y crea una nueva).
 */
export async function publicarEnMeta(
  modeloId: string,
  options: {
    forceRepublish?: boolean
    /** Override del caption (si no, autogenerado desde la moto). */
    customCaption?: string
    /** Plataformas a publicar. Default: ambas. Usado por el cron de
     *  scheduled posts cuando el usuario eligió solo una. */
    platforms?: ("IG" | "FB")[]
    /** Tipo de media: por default PHOTO_CAROUSEL (lo de siempre).
     *  VIDEO o REEL publican video en IG/FB. */
    mediaType?: "PHOTO_CAROUSEL" | "VIDEO" | "REEL"
    /** Override de assets si el caller no quiere usar moto.fotos.
     *  Para VIDEO/REEL es obligatoria una URL en videoUrls. */
    videoUrls?: string[]
    customFotos?: string[]
  } = {}
): Promise<{
  ok: boolean
  igPostId?: string
  igPermalink?: string
  fbPostId?: string
  fbPermalink?: string
  error?: string
  /** Errores por plataforma cuando es PARTIAL (una funcionó, otra no). */
  igError?: string
  fbError?: string
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
      condicion: true,
      precio: true,
      moneda: true,
      kilometros: true,
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
    const platforms = options.platforms ?? ["IG", "FB"]
    const incluyeIG = platforms.includes("IG")
    const incluyeFB = platforms.includes("FB")
    const mediaType = options.mediaType ?? "PHOTO_CAROUSEL"
    const caption = options.customCaption?.trim()
      ? options.customCaption.trim()
      : generarCaption(m)

    // === BRANCHING POR TIPO DE MEDIA ===
    if (mediaType === "VIDEO" || mediaType === "REEL") {
      const videoUrl = options.videoUrls?.[0]
      if (!videoUrl) {
        return {
          ok: false,
          error: `mediaType=${mediaType} requiere al menos una URL en videoUrls`,
        }
      }
      return await publicarVideoEnMeta(
        { igUserId: cfg.igUserId, pageId: cfg.pageId, modeloId: m.id },
        {
          videoUrl,
          caption,
          mediaType,
          incluyeIG,
          incluyeFB,
        }
      )
    }

    // Si solo es FB (sin IG), saltamos todo el flujo de carrusel.
    if (!incluyeIG) {
      let fbPostIdOnly: string | undefined
      try {
        const fb = await metaPost<FBPhotoResponse>(`/${cfg.pageId}/photos`, {
          url: fotos[0],
          caption,
          published: true,
        })
        fbPostIdOnly = fb.post_id || fb.id
        await prisma.modelo.update({
          where: { id: m.id },
          data: {
            fbPostId: fbPostIdOnly,
            fbPermalink: fbPostIdOnly
              ? `https://www.facebook.com/${fbPostIdOnly}`
              : null,
            igUltimaSync: new Date(),
          },
        })
        return {
          ok: true,
          fbPostId: fbPostIdOnly,
          fbPermalink: fbPostIdOnly
            ? `https://www.facebook.com/${fbPostIdOnly}`
            : undefined,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ok: false, error: msg, fbError: msg }
      }
    }

    // 1) Subir cada foto como carousel_item → recibimos creation_ids
    //    Guardamos el par (id, url) para que si IG rechaza un container
    //    sepamos cuál foto fue.
    const creations: { id: string; url: string }[] = []
    for (const url of fotos) {
      const r = await metaPost<IGMediaResponse>(`/${cfg.igUserId}/media`, {
        image_url: url,
        is_carousel_item: true,
      })
      if (!r.id) throw new Error(`IG respondió sin id de media para ${url}`)
      creations.push({ id: r.id, url })
      // Pausa breve para no saturar IG
      await new Promise((res) => setTimeout(res, 400))
    }

    // 1b) Esperar que cada item carousel esté FINISHED (IG los procesa
    //     async — si no, "Media ID is not available" al publicar).
    for (const c of creations) {
      await esperarMediaListo(c.id, 30000, c.url)
    }
    const creationIds = creations.map((c) => c.id)

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

    // 4) Cross-post a Facebook Page (foto principal con caption) — solo
    //    si el caller pidió ambas plataformas.
    let fbPostId: string | undefined
    let fbErrorMsg: string | undefined
    if (incluyeFB) {
      try {
        const fb = await metaPost<FBPhotoResponse>(`/${cfg.pageId}/photos`, {
          url: fotos[0],
          caption,
          published: true,
        })
        fbPostId = fb.post_id || fb.id
      } catch (e) {
        fbErrorMsg = e instanceof Error ? e.message : String(e)
        console.warn("[Meta] Cross-post a FB falló:", fbErrorMsg)
      }
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
      fbPermalink: fbPostId
        ? `https://www.facebook.com/${fbPostId}`
        : undefined,
      fbError: fbErrorMsg,
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
 * Publica un video (REEL o feed) en IG y/o FB.
 *
 * IG: POST /{ig_user_id}/media con media_type=VIDEO|REELS + video_url,
 *     polling hasta FINISHED, después media_publish.
 * FB: POST /{page_id}/videos con file_url + description.
 *
 * Restricciones de Meta para videos:
 * - REEL: vertical (9:16), 1080×1920 ideal, máx 90s, MP4 H.264 AAC.
 * - VIDEO feed: hasta 60 min, MP4/MOV, mín 600px lado corto.
 * Cloudinary puede transformar con f_mp4 + transformaciones.
 *
 * La función actualiza modelo.igPostId/fbPostId al terminar para
 * mantener traza de la última publicación de la moto.
 */
async function publicarVideoEnMeta(
  ctx: { igUserId: string; pageId: string; modeloId: string },
  args: {
    videoUrl: string
    caption: string
    mediaType: "VIDEO" | "REEL"
    incluyeIG: boolean
    incluyeFB: boolean
  }
): Promise<{
  ok: boolean
  igPostId?: string
  igPermalink?: string
  fbPostId?: string
  fbPermalink?: string
  error?: string
  igError?: string
  fbError?: string
}> {
  let igPostId: string | undefined
  let igPermalink: string | undefined
  let igErrorMsg: string | undefined
  let fbPostId: string | undefined
  let fbErrorMsg: string | undefined

  // === IG ===
  if (args.incluyeIG) {
    try {
      const igMediaType = args.mediaType === "REEL" ? "REELS" : "VIDEO"
      const container = await metaPost<IGMediaResponse>(
        `/${ctx.igUserId}/media`,
        {
          media_type: igMediaType,
          video_url: args.videoUrl,
          caption: args.caption,
          // Reels: hacer share_to_feed para que aparezca también en el feed.
          ...(args.mediaType === "REEL" ? { share_to_feed: true } : {}),
        }
      )
      // Video tarda más en procesarse — timeout más largo que fotos.
      await esperarMediaListo(container.id, 5 * 60 * 1000, args.videoUrl)
      const published = await metaPost<IGPostResponse>(
        `/${ctx.igUserId}/media_publish`,
        { creation_id: container.id }
      )
      igPostId = published.id
      try {
        const info = await metaGet<{ permalink: string }>(
          `/${published.id}?fields=permalink`
        )
        igPermalink = info.permalink
      } catch {
        // sin permalink no rompemos
      }
    } catch (e) {
      igErrorMsg = e instanceof Error ? e.message : String(e)
    }
  }

  // === FB ===
  if (args.incluyeFB) {
    try {
      const fb = await metaPost<{ id: string; post_id?: string }>(
        `/${ctx.pageId}/videos`,
        {
          file_url: args.videoUrl,
          description: args.caption,
          published: true,
        }
      )
      fbPostId = fb.post_id || fb.id
    } catch (e) {
      fbErrorMsg = e instanceof Error ? e.message : String(e)
    }
  }

  // Persistir traza
  if (igPostId || fbPostId) {
    await prisma.modelo.update({
      where: { id: ctx.modeloId },
      data: {
        ...(igPostId
          ? { igPostId, igPermalink, igUltimaSync: new Date(), igError: null }
          : {}),
        ...(fbPostId
          ? {
              fbPostId,
              fbPermalink: `https://www.facebook.com/${fbPostId}`,
            }
          : {}),
      },
    })
  }

  const okGlobal =
    (args.incluyeIG ? !!igPostId : true) && (args.incluyeFB ? !!fbPostId : true)
  return {
    ok: okGlobal,
    igPostId,
    igPermalink,
    fbPostId,
    fbPermalink: fbPostId ? `https://www.facebook.com/${fbPostId}` : undefined,
    igError: igErrorMsg,
    fbError: fbErrorMsg,
    error: !okGlobal
      ? [igErrorMsg, fbErrorMsg].filter(Boolean).join(" · ") || "Falló video"
      : undefined,
  }
}

/**
 * Cuando una moto se vende, marcamos visualmente el post de IG y FB
 * editando el caption para que diga VENDIDA. NO borramos los posts
 * porque IG/FB no permiten editar carruseles (la única forma es
 * borrar y republicar). En su lugar editamos solo el caption con un
 * prefijo "✅ VENDIDA".
 *
 * Best-effort: nunca falla la operación de venta principal.
 */
export async function marcarVendidaEnMeta(modeloId: string): Promise<void> {
  try {
    const m = await prisma.modelo.findUnique({
      where: { id: modeloId },
      select: { igPostId: true, fbPostId: true, marca: true, nombre: true, anio: true },
    })
    if (!m?.igPostId && !m?.fbPostId) return

    const titulo = `${m.marca} ${m.nombre}${m.anio ? ` ${m.anio}` : ""}`
    const captionNuevo = `✅ VENDIDA — ${titulo}\n\n¡Gracias por tu confianza! Esta moto ya tiene nuevo dueño.\n\nMotos Fernández\nWhatsApp +54 9 291 578 8671`

    // IG: editar caption del post
    if (m.igPostId) {
      try {
        await metaPost(`/${m.igPostId}`, { caption: captionNuevo })
      } catch (e) {
        console.warn("[Meta] No pude editar caption IG:", e)
      }
    }
    // FB: el endpoint es distinto, /{post_id} con message
    if (m.fbPostId) {
      try {
        await metaPost(`/${m.fbPostId}`, { message: captionNuevo })
      } catch (e) {
        console.warn("[Meta] No pude editar caption FB:", e)
      }
    }
  } catch (e) {
    console.warn("[Meta] marcarVendidaEnMeta falló:", e)
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

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

/**
 * Infiere el MOTO_TYPE (atributo obligatorio en MLA1763 motos) desde el
 * nombre/marca de la moto. Valores válidos en ML:
 * On-Off, Mini Motos, Custom, Chopper, Touring, Scooters, Enduro, Trial,
 * Cuatriciclos, Naked, Doble propósito, Crucero, Triciclos, Deportivas,
 * Motocarros, Street.
 */
function inferirMotoType(nombreCompleto: string): string {
  const n = nombreCompleto.toLowerCase()
  // Off-road / Doble propósito (CRF, XR, WR, KX, KLX, TTR, YZ, EXC, DR)
  if (/\b(crf|xr|xrl|wr|kx|klx|ttr|yz|exc|enduro|husqvarna|gas\s*gas)\b/i.test(n)) return "Enduro"
  // Doble propósito / On-Off (GS, Tenere, Versys, V-Strom, TRK, Adventure, Himalayan, Africa, Tornado)
  if (/\b(gs|tener[eé]|versys|v-?strom|trk|adventure|himalayan|africa|tornado|rally|dr\s?\d|dakar)\b/i.test(n)) return "On-Off"
  // Deportivas (Ninja, GSXR, GSX-R, CBR, R1, R6, ZX, Panigale, RR, RC)
  if (/\b(ninja|gsxr|gsx-?r|cbr|\br[16]\b|zx|panigale|\brr\b|\brc\b|rsv|rc8|streetfighter|h2)\b/i.test(n)) return "Deportivas"
  // Custom / Cruiser (Vulcan, Harley, Iron, Sportster, Bobber, Diavel, V-Rod)
  if (/\b(vulcan|harley|sportster|iron|bobber|diavel|v-?rod|fat\s*boy|softail|chopper)\b/i.test(n)) return "Custom"
  // Touring (Goldwing, K1600, Pan America, Multistrada touring)
  if (/\b(goldwing|gold\s*wing|k1600|pan\s*america|multistrada)\b/i.test(n)) return "Touring"
  // Scooters (Vespa, Beverly, Tmax, T-Max, SXR, MP3, Sym, Kymco, Sundown, Address, Lambretta, GTS, VXL)
  if (/\b(vespa|beverly|t-?max|sxr|mp3|sym|kymco|sundown|address|lambretta|gts|vxl|scoot)\b/i.test(n)) return "Scooters"
  // Cuatriciclos (Raptor, YFM, TRX, Sportsman, RZR, Outlander, Polaris, ATV)
  if (/\b(raptor|yfm|trx|sportsman|rzr|outlander|polaris|atv|cuatri)\b/i.test(n)) return "Cuatriciclos"
  // Mini cross
  if (/\bmini\s*cross\b/i.test(n)) return "Mini Motos"
  // Default Naked (calle estándar)
  return "Naked"
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
      mlListingId: true, mlListingType: true,
    },
  })
  if (!m) return { ok: false, error: "Moto no encontrada" }
  if (!m.precio) return { ok: false, error: "La moto no tiene precio cargado" }
  if (m.fotos.length === 0) return { ok: false, error: "La moto no tiene fotos" }

  // Si el nombre ya empieza con la marca, no duplicarla en el título
  // (caso típico del import del Cardfile donde nombre = "Honda CRF 250 Rally"
  //  y marca = "Honda" → no queremos "Honda Honda CRF 250 Rally").
  const marcaTrim = m.marca.trim()
  const nombreTrim = m.nombre.trim()
  const marcaLower = marcaTrim.toLowerCase()
  const nombreLower = nombreTrim.toLowerCase()
  const tituloBase = nombreLower.startsWith(marcaLower)
    ? nombreTrim
    : `${marcaTrim} ${nombreTrim}`
  // Normalizar espacios duplicados ("Honda  CRF" → "Honda CRF")
  const titulo = `${tituloBase}${m.anio ? ` ${m.anio}` : ""}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)

  try {
    // Si ya existe la publicación, hacemos UPDATE
    if (m.mlListingId) {
      // 1) Consultamos el estado actual real en ML. Nuestro DB puede estar
      //    desactualizado: una moto que dejamos como "paused" puede haber
      //    pasado a "under_review" (ML revisando) y en ese estado NO se
      //    puede modificar nada (tira "item.price.not_modifiable").
      let estadoActual: string | undefined
      try {
        const cur = await mlGet<{ status: string }>(
          `/items/${m.mlListingId}?attributes=status`
        )
        estadoActual = cur?.status
      } catch {
        // si la GET falla, seguimos al PUT y veremos el error real ahí
      }

      // 2) Estados en los que ML no permite editar el item.
      const NO_EDITABLE = new Set([
        "under_review",
        "payment_required",
        "inactive",
      ])
      if (estadoActual && NO_EDITABLE.has(estadoActual)) {
        const msg =
          estadoActual === "under_review"
            ? "Mercado Libre está revisando esta publicación (under_review). No se puede modificar hasta que ML termine la revisión, puede tardar varias horas."
            : `La publicación está en estado "${estadoActual}" y ML no permite modificarla.`
        await prisma.modelo
          .update({
            where: { id: m.id },
            data: {
              mlEstado: estadoActual,
              mlError: msg.slice(0, 500),
              mlUltimaSync: new Date(),
            },
          })
          .catch(() => null)
        return { ok: false, error: msg }
      }

      // 3) Construir payload. Si está pausada, la reactivamos en el mismo
      //    PUT (intent del usuario al hacer click en "Actualizar" suele ser
      //    relistarla). Si está active, solo cambiamos lo que cambió.
      const payload: Record<string, unknown> = { price: m.precio }
      if (estadoActual === "paused" || estadoActual === "closed") {
        payload.status = "active"
      }

      const update = await mlPut<{
        id: string
        permalink: string
        status: string
      }>(`/items/${m.mlListingId}`, payload)
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

    // Mapear nombre de la moto a MOTO_TYPE (atributo obligatorio para vehículos en MLA)
    // Heurística simple por palabras clave del nombre.
    const motoType = inferirMotoType(`${m.marca} ${m.nombre}`)

    // Filtrar fotos: solo URLs públicas absolutas (ML necesita poder descargarlas).
    // Saca el placeholder /images/logo-clasico.png y cualquier otra ruta relativa.
    const fotosPublicas = m.fotos
      .filter((url) => /^https?:\/\//i.test(url))
      .slice(0, 12)
      // Cloudinary: forzar JPG optimizado max 1600px. Necesario porque
      // muchas fotos del catalogo son HEIC del iPhone que ML no procesa
      // bien sin conversion.
      .map((url) =>
        url.includes("res.cloudinary.com")
          ? url.replace(/\/upload\//, "/upload/f_jpg,q_auto:good,w_1600,c_limit/")
          : url
      )

    // Si el color es multi (ej "Negra, azul y roja"), tomamos solo el primero
    // y lo normalizamos a la lista válida de ML (capitalizando primera letra).
    const colorNormalizado = m.color
      ? (() => {
          const primero = m.color.split(/[,\s/]/).filter(Boolean)[0] || ""
          // ML usa formato "Negro" no "Negra"; sacar 'a' al final solo si es color común
          let c = primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase()
          // Femenino → masculino para los más comunes
          const masc: Record<string, string> = {
            Negra: "Negro",
            Roja: "Rojo",
            Blanca: "Blanco",
            Amarilla: "Amarillo",
            Naranja: "Naranja",
            Gris: "Gris",
          }
          if (masc[c]) c = masc[c]
          return c
        })()
      : null

    if (fotosPublicas.length === 0) {
      return { ok: false, error: "La moto no tiene fotos con URL pública (Cloudinary)" }
    }

    // Para vehículos en MLA, ML requiere modo "classified" (clasificados/avisos).
    // El comprador no compra directo, te contacta para coordinar.
    const body = {
      title: titulo,
      category_id: categoryId,
      price: m.precio,
      currency_id: m.moneda === "USD" ? "USD" : "ARS",
      available_quantity: 1,
      buying_mode: "classified",
      // Listing type configurable por moto (campo mlListingType, default "free").
      // free: gratis (limitado por mes). silver/gold/gold_premium: pago, mejor visibilidad.
      // bronze/gold_special/gold_pro NO aplican a MLA1763.
      listing_type_id: m.mlListingType || "free",
      condition,
      pictures: fotosPublicas.map((url) => ({ source: url })),
      // Ubicación obligatoria para clasificados
      location: {
        country: { id: "AR", name: "Argentina" },
        state: { id: "AR-B", name: "Buenos Aires" },
        city: { name: "Bahía Blanca" },
        address_line: "",
      },
      attributes: [
        { id: "MOTO_TYPE", value_name: motoType },
        { id: "BRAND", value_name: m.marca.trim() },
        { id: "MODEL", value_name: m.nombre.trim() },
        // ITEM_CONDITION exige value_id, no value_name (sino tira
        // "Couldn't obtain a valid item condition mapping").
        // 2230284 = Nuevo, 2230581 = Usado.
        {
          id: "ITEM_CONDITION",
          value_id: condition === "new" ? "2230284" : "2230581",
        },
        ...(m.anio ? [{ id: "VEHICLE_YEAR", value_name: String(m.anio) }] : []),
        ...(m.kilometros != null
          ? [{ id: "KILOMETERS", value_name: `${m.kilometros} km` }]
          : []),
        ...(m.cilindrada
          ? [{ id: "ENGINE_DISPLACEMENT", value_name: m.cilindrada }]
          : []),
        ...(m.transmision ? [{ id: "TRANSMISSION", value_name: m.transmision }] : []),
        ...(m.combustible ? [{ id: "FUEL_TYPE", value_name: m.combustible }] : []),
        ...(colorNormalizado ? [{ id: "COLOR", value_name: colorNormalizado }] : []),
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
 * Refresca el estado de las motos publicadas en ML sin modificarlas.
 * Útil cuando ML cambió el estado por su lado (ej: under_review → active,
 * o paused por baja calidad de fotos) y nuestro cache quedó desactualizado.
 * Si modeloIds es undefined, refresca todas las que tengan mlListingId.
 */
export async function refrescarEstadoML(modeloIds?: string[]): Promise<{
  ok: boolean
  total: number
  actualizadas: number
  errores: number
}> {
  const motos = await prisma.modelo.findMany({
    where: {
      mlListingId: { not: null },
      ...(modeloIds && modeloIds.length > 0 ? { id: { in: modeloIds } } : {}),
    },
    select: { id: true, mlListingId: true, mlEstado: true },
  })
  let actualizadas = 0
  let errores = 0
  for (const m of motos) {
    if (!m.mlListingId) continue
    try {
      const cur = await mlGet<{ status: string; permalink?: string }>(
        `/items/${m.mlListingId}?attributes=status,permalink`
      )
      if (cur?.status) {
        await prisma.modelo.update({
          where: { id: m.id },
          data: {
            mlEstado: cur.status,
            mlPermalink: cur.permalink ?? undefined,
            mlUltimaSync: new Date(),
            // Si volvió a estado bueno, limpiamos el último error
            ...(cur.status === "active" || cur.status === "paused"
              ? { mlError: null }
              : {}),
          },
        })
        actualizadas++
      }
    } catch (e) {
      errores++
      await prisma.modelo
        .update({
          where: { id: m.id },
          data: {
            mlError: (e instanceof Error ? e.message : "Error refrescando estado").slice(0, 500),
            mlUltimaSync: new Date(),
          },
        })
        .catch(() => null)
    }
    // pausa breve para no saturar a ML
    await new Promise((r) => setTimeout(r, 300))
  }
  return { ok: true, total: motos.length, actualizadas, errores }
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

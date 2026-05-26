// Cliente HTTP para la Graph API de Meta (Facebook + Instagram).
// Maneja OAuth, intercambio de tokens (short → long-lived), listado de
// pages del usuario, y descubrimiento de la cuenta IG Business asociada.
//
// Doc oficial:
//   https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
//   https://developers.facebook.com/docs/instagram-api/getting-started
import { prisma } from "@/lib/prisma"
import { decryptToken, encryptToken } from "@/lib/crypto/tokens"

// Versión actual de la Graph API. Cambió de v18.0 → v25.0 (la v18 se
// acerca a deprecación, Meta soporta cada versión ~2 años).
//
// La versión por default vive en una constante para fallback; cada
// MetaConfig en DB puede sobreescribirla con su campo `apiVersion` para
// rollear versiones sin redeploy.
const DEFAULT_API_VERSION = process.env.META_API_VERSION || "v25.0"
const GRAPH_BASE = "https://graph.facebook.com"
const FB_AUTH_BASE = "https://www.facebook.com"

function graphApi(version: string = DEFAULT_API_VERSION): string {
  return `${GRAPH_BASE}/${version}`
}

function fbAuthUrl(version: string = DEFAULT_API_VERSION): string {
  return `${FB_AUTH_BASE}/${version}/dialog/oauth`
}

// Compat: muchas funciones usaban el string fijo `GRAPH_API`. Lo mantengo
// como helper que devuelve la URL default — para versiones específicas se
// usa graphApi(version).
const GRAPH_API = graphApi()
const FB_AUTH = fbAuthUrl()

// Permisos para publicar carruseles en IG y fotos en FB Page.
// business_management es necesario porque la pagina vive dentro de
// un Business Manager (lo confirmamos via /api/admin/meta/debug —
// /me/accounts vacio + /me/businesses requiere ese permiso).
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",")

function getEnv() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error("Faltan META_APP_ID o META_APP_SECRET en env vars")
  }
  const baseUrl = process.env.META_REDIRECT_BASE || "https://www.motosfernandez.com.ar"
  const redirectUri = `${baseUrl}/api/admin/meta/callback`
  return { appId, appSecret, redirectUri }
}

/** URL para redirigir al usuario al login de Meta y autorizar la app. */
export function getAuthUrl(state: string = ""): string {
  const { appId, redirectUri } = getEnv()
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    auth_type: "rerequest",
  })
  if (state) params.set("state", state)
  return `${FB_AUTH}?${params.toString()}`
}

type ShortTokenResponse = {
  access_token: string
  token_type: string
  expires_in?: number
}

/** Intercambia el `code` recibido del callback por un user access token (short-lived). */
export async function exchangeCodeForToken(code: string): Promise<ShortTokenResponse> {
  const { appId, appSecret, redirectUri } = getEnv()
  const url = new URL(`${GRAPH_API}/oauth/access_token`)
  url.searchParams.set("client_id", appId)
  url.searchParams.set("client_secret", appSecret)
  url.searchParams.set("code", code)
  url.searchParams.set("redirect_uri", redirectUri)

  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta token exchange falló: ${JSON.stringify(data)}`)
  }
  return data as ShortTokenResponse
}

/** Convierte un user token short-lived (1h) en uno long-lived (~60 días). */
export async function getLongLivedUserToken(shortToken: string): Promise<ShortTokenResponse> {
  const { appId, appSecret } = getEnv()
  const url = new URL(`${GRAPH_API}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", appId)
  url.searchParams.set("client_secret", appSecret)
  url.searchParams.set("fb_exchange_token", shortToken)

  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta long-lived token exchange falló: ${JSON.stringify(data)}`)
  }
  return data as ShortTokenResponse
}

type Page = {
  id: string
  name: string
  access_token: string
  category?: string
  tasks?: string[]
}

/**
 * Lista todas las pages que administra el user (con sus page access tokens).
 * Intenta dos endpoints:
 *   1. /me/accounts → pages que el user admin directamente
 *   2. /me/businesses → si es admin via Business Manager, listar pages de cada business
 * Concatena los resultados deduplicando por page id.
 */
export async function getPages(userToken: string): Promise<Page[]> {
  const all = new Map<string, Page>()

  // 1) Intento directo: /me/accounts
  try {
    const url = new URL(`${GRAPH_API}/me/accounts`)
    url.searchParams.set("access_token", userToken)
    url.searchParams.set("fields", "id,name,access_token,category,tasks")
    url.searchParams.set("limit", "100")
    const res = await fetch(url.toString())
    const data = await res.json()
    if (res.ok && Array.isArray(data.data)) {
      for (const p of data.data as Page[]) {
        if (p.id) all.set(p.id, p)
      }
    }
  } catch (e) {
    console.warn("[Meta] /me/accounts falló:", e)
  }

  // 2) Fallback: pages via Business Manager (si la pagina está en un BM,
  //    /me/accounts capaz no la lista). Listamos los BMs del user y por
  //    cada uno las owned_pages + client_pages.
  try {
    const burl = new URL(`${GRAPH_API}/me/businesses`)
    burl.searchParams.set("access_token", userToken)
    burl.searchParams.set("fields", "id,name")
    burl.searchParams.set("limit", "50")
    const bres = await fetch(burl.toString())
    const bdata = await bres.json()
    if (bres.ok && Array.isArray(bdata.data)) {
      for (const biz of bdata.data as { id: string; name: string }[]) {
        // Owned pages del business
        for (const path of ["owned_pages", "client_pages"]) {
          try {
            const pagesUrl = new URL(`${GRAPH_API}/${biz.id}/${path}`)
            pagesUrl.searchParams.set("access_token", userToken)
            pagesUrl.searchParams.set("fields", "id,name,access_token,category,tasks")
            pagesUrl.searchParams.set("limit", "100")
            const pres = await fetch(pagesUrl.toString())
            const pdata = await pres.json()
            if (pres.ok && Array.isArray(pdata.data)) {
              for (const p of pdata.data as Page[]) {
                if (p.id && !all.has(p.id)) all.set(p.id, p)
              }
            }
          } catch (e) {
            console.warn(`[Meta] /${biz.id}/${path} falló:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.warn("[Meta] /me/businesses falló:", e)
  }

  return Array.from(all.values())
}

/**
 * Diagnostico: devuelve una serializacion de lo que Meta sabe del user
 * para entender por que no aparecen pages. Solo usar desde el endpoint
 * de debug. NO loggear el access_token completo.
 */
export async function diagnosticoMeta(
  pageToken: string,
  pageId: string | null,
  igUserId: string | null
) {
  const result: Record<string, unknown> = {}

  const safeFetch = async (label: string, urlBuilder: () => URL) => {
    try {
      const url = urlBuilder()
      url.searchParams.set("access_token", pageToken)
      const res = await fetch(url.toString())
      const data = await res.json()
      result[label] = { status: res.status, body: data }
    } catch (e) {
      result[label] = { error: e instanceof Error ? e.message : String(e) }
    }
  }

  // 1) Con un Page Access Token, /me devuelve la PAGE, no el usuario.
  //    Sin pedir "email" para que no falle. Si esto anda, el token está vivo.
  await safeFetch("me_as_page", () => {
    const u = new URL(`${GRAPH_API}/me`)
    u.searchParams.set("fields", "id,name,category,tasks")
    return u
  })

  // 2) Inspección del token: subject, app id, scopes, expiración real.
  //    Necesita debug_token, no /me/permissions.
  await safeFetch("token_inspect", () => {
    const u = new URL(`${GRAPH_API}/debug_token`)
    u.searchParams.set("input_token", pageToken)
    return u
  })

  if (pageId) {
    // 3) La Page directamente, pidiendo si tiene IG Business linkeada.
    //    Acá está la pista clave: ¿la Page apunta a la IG que esperamos?
    await safeFetch("page_with_ig", () => {
      const u = new URL(`${GRAPH_API}/${pageId}`)
      u.searchParams.set(
        "fields",
        "id,name,instagram_business_account{id,username,name},access_token"
      )
      return u
    })
  }

  if (igUserId) {
    // 4) La cuenta IG por ID. Si esto falla con subcode 33, el page token
    //    NO tiene acceso a esta cuenta IG (problema de scopes o la cuenta
    //    no está linkeada a la Page del token).
    await safeFetch("ig_account", () => {
      const u = new URL(`${GRAPH_API}/${igUserId}`)
      u.searchParams.set("fields", "id,username,name,account_type")
      return u
    })
  }

  return result
}

type FBUser = { id: string; name: string }

/** Datos básicos del user que conectó. */
export async function getUserInfo(userToken: string): Promise<FBUser> {
  const url = new URL(`${GRAPH_API}/me`)
  url.searchParams.set("access_token", userToken)
  url.searchParams.set("fields", "id,name")
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta /me falló: ${JSON.stringify(data)}`)
  }
  return data as FBUser
}

/**
 * Devuelve el ID de la cuenta IG Business linkeada a una page de FB.
 * Si la page no tiene IG vinculada, devuelve null.
 */
export async function getIGAccountForPage(
  pageId: string,
  pageToken: string
): Promise<{ id: string; username: string } | null> {
  const url = new URL(`${GRAPH_API}/${pageId}`)
  url.searchParams.set("fields", "instagram_business_account{id,username}")
  url.searchParams.set("access_token", pageToken)
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta IG account lookup falló: ${JSON.stringify(data)}`)
  }
  const ig = data.instagram_business_account
  if (!ig?.id) return null
  return { id: ig.id, username: ig.username || "" }
}

/** Devuelve el page access token vigente, o null si la app no está conectada. */
export async function getValidPageToken(): Promise<string | null> {
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageAccessToken) return null
  // El token se guarda encriptado (prefijo "enc:v1:"). decryptToken
  // maneja transparentemente el caso legacy de texto plano para no
  // romper datos pre-migración.
  return decryptToken(cfg.pageAccessToken)
}

/**
 * Persiste un nuevo page access token, encriptándolo antes de guardar.
 * Acepta texto plano (lo encripta) o un valor ya encriptado (idempotente).
 */
export async function savePageAccessToken(
  token: string,
  extra: { igUserId?: string | null; pageId?: string | null } = {}
): Promise<void> {
  await prisma.metaConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      pageAccessToken: encryptToken(token),
      ...extra,
    },
    update: {
      pageAccessToken: encryptToken(token),
      ...extra,
    },
  })
}

/** Wrapper de fetch que agrega el page access token. */
export async function metaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidPageToken()
  if (!token) throw new Error("Meta no está conectado. Conectalo desde /admin/meta")
  const url = path.startsWith("http") ? path : `${GRAPH_API}${path}`
  const u = new URL(url)
  if (!u.searchParams.has("access_token")) {
    u.searchParams.set("access_token", token)
  }
  return fetch(u.toString(), init)
}

/**
 * Convierte un error de Graph API en un mensaje accionable. Los códigos
 * más comunes que vemos en producción:
 * - code 190: token expirado/revocado → reconectar
 * - code 100 + subcode 33: objeto no existe o sin permiso → reconectar
 *   (también pasa con tokens viejos que perdieron alcance sobre la página)
 * - code 100 + subcode 463: media inválido (aspect ratio, formato, etc.)
 */
function interpretarErrorMeta(status: number, raw: string): string {
  try {
    const data = JSON.parse(raw) as {
      error?: { code?: number; error_subcode?: number; message?: string }
    }
    const code = data.error?.code
    const subcode = data.error?.error_subcode
    const msg = data.error?.message || raw

    if (code === 190 || (code === 100 && subcode === 33)) {
      return `Sesión con Meta vencida o sin permisos (code ${code}/${subcode ?? "-"}). Andá a /admin/meta y tocá "Reconectar con Meta". Detalle original: ${msg}`
    }
    if (code === 100 && subcode === 463) {
      return `Meta rechazó la foto (aspect ratio fuera de 4:5 a 1.91:1, o formato no JPG). Detalle: ${msg}`
    }
    return `Meta error ${code ?? status}/${subcode ?? "-"}: ${msg}`
  } catch {
    return raw
  }
}

export async function metaGet<T = unknown>(path: string): Promise<T> {
  const res = await metaFetch(path)
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(
      `Meta GET ${path} falló (${res.status}): ${interpretarErrorMeta(res.status, txt)}`
    )
  }
  return res.json() as Promise<T>
}

export async function metaPost<T = unknown>(path: string, body: unknown): Promise<T> {
  // Meta Graph API acepta el body como query string params (POST con form
  // o sin body) — usamos JSON que también acepta para consistencia.
  const res = await metaFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(
      `Meta POST ${path} falló (${res.status}): ${interpretarErrorMeta(res.status, txt)}`
    )
  }
  return res.json() as Promise<T>
}

/** Estado de la conexión. Útil para mostrar en /admin/meta. */
export async function getMetaStatus() {
  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageAccessToken) {
    return { connected: false as const }
  }
  return {
    connected: true as const,
    userName: cfg.userName,
    pageName: cfg.pageName,
    pageId: cfg.pageId,
    igUsername: cfg.igUsername,
    igUserId: cfg.igUserId,
    expiresAt: cfg.expiresAt,
  }
}

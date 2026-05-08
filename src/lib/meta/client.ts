// Cliente HTTP para la Graph API de Meta (Facebook + Instagram).
// Maneja OAuth, intercambio de tokens (short → long-lived), listado de
// pages del usuario, y descubrimiento de la cuenta IG Business asociada.
//
// Doc oficial:
//   https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
//   https://developers.facebook.com/docs/instagram-api/getting-started
import { prisma } from "@/lib/prisma"

// v18.0 es la versión más estable y ampliamente soportada para
// publicación. Versiones más nuevas (v22+, v23) pueden rechazar
// scopes con "Invalid Scopes" cuando la app es Business sin verificar.
const GRAPH_API = "https://graph.facebook.com/v18.0"
const FB_AUTH = "https://www.facebook.com/v18.0/dialog/oauth"

// Permisos para publicar carruseles en IG y fotos en FB Page.
// pages_read_engagement es requerido por FB para que el OAuth muestre
// la pantalla de selección de páginas correctamente.
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
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

/** Lista todas las pages que administra el user (con sus page access tokens). */
export async function getPages(userToken: string): Promise<Page[]> {
  const url = new URL(`${GRAPH_API}/me/accounts`)
  url.searchParams.set("access_token", userToken)
  url.searchParams.set("fields", "id,name,access_token,category,tasks")
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Meta /me/accounts falló: ${JSON.stringify(data)}`)
  }
  return (data.data || []) as Page[]
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
  return cfg.pageAccessToken
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

export async function metaGet<T = unknown>(path: string): Promise<T> {
  const res = await metaFetch(path)
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Meta GET ${path} falló (${res.status}): ${txt}`)
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
    throw new Error(`Meta POST ${path} falló (${res.status}): ${txt}`)
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

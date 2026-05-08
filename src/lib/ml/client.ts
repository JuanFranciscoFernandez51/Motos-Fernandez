// Cliente HTTP para la API de Mercado Libre con auto-refresh del token OAuth.
// Uso: const ml = await getMLClient(); const r = await ml.get("/users/me")
import { prisma } from "@/lib/prisma"

const ML_API = "https://api.mercadolibre.com"
const ML_AUTH = "https://auth.mercadolibre.com.ar"

function getEnv() {
  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Faltan ML_CLIENT_ID o ML_CLIENT_SECRET en env vars")
  }
  // Redirect URI: tiene que coincidir EXACTO con el que pegaste en
  // developers.ml. Hardcodeado al dominio bueno (NEXTAUTH_URL apunta al
  // viejo de Vercel y rompia el OAuth con redirect_uri_mismatch).
  // Override con env var ML_REDIRECT_BASE si algun dia cambias dominio.
  const baseUrl = process.env.ML_REDIRECT_BASE || "https://www.motosfernandez.com.ar"
  const redirectUri = `${baseUrl}/api/admin/ml/callback`
  return { clientId, clientSecret, redirectUri }
}

/**
 * URL para que el user clickee y autorice la app en ML.
 */
export function getAuthUrl(state: string = ""): string {
  const { clientId, redirectUri } = getEnv()
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
  })
  if (state) params.set("state", state)
  return `${ML_AUTH}/authorization?${params.toString()}`
}

/**
 * Intercambiar el `code` recibido del callback por un access+refresh token.
 */
export async function exchangeCodeForToken(code: string) {
  const { clientId, clientSecret, redirectUri } = getEnv()
  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`ML token exchange falló: ${JSON.stringify(data)}`)
  }
  return data as {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    user_id: number
    scope: string
  }
}

/**
 * Renovar el access_token usando el refresh_token guardado.
 */
async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getEnv()
  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`ML refresh token falló: ${JSON.stringify(data)}`)
  }
  return data as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
}

/**
 * Obtiene el access_token vigente, renovándolo si está vencido o por vencer.
 * Devuelve null si no hay config (la app aún no fue autorizada).
 */
async function getValidAccessToken(): Promise<string | null> {
  const cfg = await prisma.mLConfig.findUnique({ where: { id: "default" } })
  if (!cfg || !cfg.accessToken || !cfg.refreshToken) return null

  const now = Date.now()
  const expiresAt = cfg.expiresAt ? cfg.expiresAt.getTime() : 0
  const minutoMs = 60 * 1000
  // Renovar si quedan menos de 5 min de vida
  if (expiresAt - now < 5 * minutoMs) {
    try {
      const fresh = await refreshAccessToken(cfg.refreshToken)
      const nuevaExpiracion = new Date(now + fresh.expires_in * 1000)
      await prisma.mLConfig.update({
        where: { id: "default" },
        data: {
          accessToken: fresh.access_token,
          refreshToken: fresh.refresh_token,
          expiresAt: nuevaExpiracion,
        },
      })
      return fresh.access_token
    } catch (e) {
      console.error("[ML] Error renovando token:", e)
      return null
    }
  }
  return cfg.accessToken
}

/**
 * Realiza una llamada autenticada a la API de ML.
 * Refresca el token automáticamente si hace falta.
 */
export async function mlFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken()
  if (!token) throw new Error("ML no está conectado. Conectalo desde /admin/ml")

  const url = path.startsWith("http") ? path : `${ML_API}${path}`
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(url, { ...init, headers })
}

/**
 * GET helper que parsea JSON.
 */
export async function mlGet<T = unknown>(path: string): Promise<T> {
  const res = await mlFetch(path)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ML GET ${path} falló (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

/**
 * POST helper.
 */
export async function mlPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await mlFetch(path, { method: "POST", body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`ML POST ${path} falló (${res.status}): ${txt}`)
  }
  return res.json() as Promise<T>
}

/**
 * PUT helper.
 */
export async function mlPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await mlFetch(path, { method: "PUT", body: JSON.stringify(body) })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`ML PUT ${path} falló (${res.status}): ${txt}`)
  }
  return res.json() as Promise<T>
}

/**
 * Lee la config actual (estado de conexión). Útil para mostrar en /admin/ml.
 */
export async function getMLStatus() {
  const cfg = await prisma.mLConfig.findUnique({ where: { id: "default" } })
  if (!cfg || !cfg.accessToken) {
    return { connected: false as const }
  }
  return {
    connected: true as const,
    userId: cfg.userId,
    nickname: cfg.nickname,
    email: cfg.email,
    expiresAt: cfg.expiresAt,
    siteId: cfg.siteId,
  }
}

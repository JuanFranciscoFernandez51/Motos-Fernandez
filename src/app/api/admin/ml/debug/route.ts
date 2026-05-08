import { NextResponse } from "next/server"
import { getAuthUrl, getMLStatus } from "@/lib/ml/client"

export const dynamic = "force-dynamic"

/**
 * Endpoint temporal de diagnóstico. NO requiere auth (en bypass del middleware).
 * Borrar después de debuggear.
 *
 * Devuelve:
 * - Si las env vars de ML estan presentes (sin valores).
 * - El URL de OAuth que se generaria (para verificar redirect_uri).
 * - Estado de la conexion actual (si hay token).
 */
export async function GET() {
  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const baseUrl =
    process.env.ML_REDIRECT_BASE ||
    process.env.NEXTAUTH_URL ||
    "https://www.motosfernandez.com.ar"

  let authUrl: string | null = null
  let authUrlError: string | null = null
  try {
    authUrl = getAuthUrl()
  } catch (e) {
    authUrlError = e instanceof Error ? e.message : String(e)
  }

  let status
  try {
    status = await getMLStatus()
  } catch (e) {
    status = { error: e instanceof Error ? e.message : String(e) }
  }

  return NextResponse.json({
    deployTime: new Date().toISOString(),
    envVars: {
      ML_CLIENT_ID: {
        set: !!clientId,
        length: clientId?.length || 0,
        preview: clientId ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : null,
      },
      ML_CLIENT_SECRET: {
        set: !!clientSecret,
        length: clientSecret?.length || 0,
      },
      ML_REDIRECT_BASE: process.env.ML_REDIRECT_BASE || "(no seteado)",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(no seteado)",
      baseUrlResolved: baseUrl,
      redirectUri: `${baseUrl}/api/admin/ml/callback`,
    },
    authUrl,
    authUrlError,
    status,
  })
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getAuthUrl } from "@/lib/meta/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Inicia el flujo OAuth con Meta. Redirige al usuario a la pantalla de
 * login/permisos de Facebook. Cuando autoriza, Meta vuelve a /callback.
 *
 * Si las env vars no están seteadas (o cualquier otro error), redirige
 * a /admin/meta?error=... en vez de devolver un response sin body que
 * el browser interpreta como descarga de .txt.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const errorRedirect = (msg: string) =>
    NextResponse.redirect(`${url.origin}/admin/meta?error=${encodeURIComponent(msg)}`)

  try {
    const session = await requireAdmin()
    if (!session) {
      return errorRedirect("No autorizado: iniciá sesión de admin antes")
    }
    // Por default: solo scopes orgánicos (publicación a IG/FB) — siempre
    // funciona. Con ?withAds=1 pide también los de Marketing API, que
    // requieren que la app de Meta los tenga aprobados/agregados como
    // producto. Sin esa aprobación previa, Meta rebota "Invalid Scopes".
    const withAds = url.searchParams.get("withAds") === "1"
    const authUrl = getAuthUrl("admin", withAds ? "full" : "organic")
    return NextResponse.redirect(authUrl)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return errorRedirect(msg)
  }
}

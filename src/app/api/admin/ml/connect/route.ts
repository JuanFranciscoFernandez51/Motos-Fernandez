import { NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/ml/client"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * Inicia el flujo OAuth: redirige al admin a la pantalla de autorización
 * de Mercado Libre. Cuando el user clickea "Autorizar" en ML, ML redirige
 * a /api/admin/ml/callback con el ?code=XXX.
 */
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "https://www.motosfernandez.com.ar"))
  }

  const url = getAuthUrl()
  return NextResponse.redirect(url)
}

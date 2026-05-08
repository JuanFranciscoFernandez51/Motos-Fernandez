import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getAuthUrl } from "@/lib/meta/client"

export const dynamic = "force-dynamic"

/**
 * Inicia el flujo OAuth con Meta. Redirige al usuario a la pantalla de
 * login/permisos de Facebook. Cuando autoriza, Meta vuelve a /callback.
 */
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  return NextResponse.redirect(getAuthUrl("admin"))
}

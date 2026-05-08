import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { diagnosticoMeta } from "@/lib/meta/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Diagnostico de la conexion con Meta. Llama a varios endpoints de
 * Graph API y muestra que devuelve cada uno, para entender por que
 * /me/accounts no devuelve la pagina de Motos Fernandez.
 *
 * NO expone el access_token completo en la respuesta.
 */
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageAccessToken) {
    return NextResponse.json(
      { error: "No hay token guardado. Conectate primero desde /admin/meta" },
      { status: 400 }
    )
  }

  const diag = await diagnosticoMeta(cfg.pageAccessToken)

  return NextResponse.json(
    {
      stored: {
        userId: cfg.userId,
        userName: cfg.userName,
        pageId: cfg.pageId,
        pageName: cfg.pageName,
        igUserId: cfg.igUserId,
        igUsername: cfg.igUsername,
        expiresAt: cfg.expiresAt,
        tokenPrefix: cfg.pageAccessToken.slice(0, 12) + "...",
      },
      diagnostico: diag,
    },
    { status: 200 }
  )
}

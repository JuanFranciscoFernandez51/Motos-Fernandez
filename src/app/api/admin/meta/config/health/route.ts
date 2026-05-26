import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import {
  EXPECTED_SCOPES,
  fetchTokenScopes,
  getValidPageToken,
} from "@/lib/meta/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Healthcheck de la conexión con Meta:
 * - ¿Hay token guardado?
 * - ¿Está vigente (no rechazado por Graph)?
 * - ¿Tiene todos los scopes que esperamos (orgánicos + ads)?
 * - ¿La cuenta de ads está conectada?
 *
 * Lo consumen:
 * - El panel /admin/meta para mostrar el estado actual (verde/ámbar/rojo).
 * - El cron check-token-health (futuro) para alertar al admin.
 *
 * Responde JSON con shape estable que la UI puede consumir directo:
 *   {
 *     connected: boolean,
 *     scopes: { all: string[], missing: string[], adsReady: boolean },
 *     tokenValid: boolean,
 *     pageId, pageName, igUsername, adAccountId,
 *     issues: string[]
 *   }
 */
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  const issues: string[] = []

  if (!cfg?.pageAccessToken) {
    return NextResponse.json({
      connected: false,
      tokenValid: false,
      scopes: { all: [], missing: EXPECTED_SCOPES, adsReady: false },
      pageId: null,
      pageName: null,
      igUsername: null,
      adAccountId: null,
      issues: ["Meta no está conectado. Andá a /admin/meta y conectalo."],
    })
  }

  // Token vigente: pedimos los scopes actuales — si Graph los devuelve,
  // el token sigue funcionando. Si falla, marcamos no válido.
  const token = await getValidPageToken()
  const scopes = token ? await fetchTokenScopes(token) : []
  const tokenValid = scopes.length > 0
  if (!tokenValid) {
    issues.push("El token guardado no responde. Reconectá Meta.")
  }

  const missing = EXPECTED_SCOPES.filter((s) => !scopes.includes(s))
  const adsReady = ["ads_management", "ads_read"].every((s) =>
    scopes.includes(s)
  )

  if (missing.length > 0) {
    issues.push(
      `Faltan scopes: ${missing.join(", ")}. Reconectá Meta para habilitarlos.`
    )
  }
  if (!cfg.adAccountId) {
    issues.push(
      "Falta configurar el ad account (adAccountId). Va a hacerse en el wizard de Ads."
    )
  }

  // Persistir el snapshot de scopes y la fecha de chequeo. Útil para
  // dashboard y para que el cron diario no tenga que recalcular.
  await prisma.metaConfig.update({
    where: { id: "default" },
    data: {
      adsTokenScopes: scopes,
      lastTokenCheckAt: new Date(),
    },
  })

  return NextResponse.json({
    connected: true,
    tokenValid,
    scopes: { all: scopes, missing, adsReady },
    pageId: cfg.pageId,
    pageName: cfg.pageName,
    igUsername: cfg.igUsername,
    adAccountId: cfg.adAccountId,
    apiVersion: cfg.apiVersion,
    lastTokenCheckAt: new Date().toISOString(),
    issues,
  })
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { listAdAccounts, getAdAccountInfo } from "@/lib/meta/ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/meta/ad-account
 * Devuelve el ad account configurado actualmente + la lista de
 * accounts disponibles para elegir.
 *
 * Lo usa el wizard /admin/meta/ads cuando adAccountId es null (todavía
 * no eligió) o cuando el admin quiere cambiar.
 */
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cfg = await prisma.metaConfig.findUnique({ where: { id: "default" } })
  if (!cfg?.pageAccessToken) {
    return NextResponse.json(
      { error: "Meta no está conectado todavía. Conectalo desde /admin/meta" },
      { status: 400 }
    )
  }

  let accounts: Awaited<ReturnType<typeof listAdAccounts>> = []
  let listError: string | null = null
  try {
    accounts = await listAdAccounts()
  } catch (e) {
    listError = e instanceof Error ? e.message : String(e)
  }

  let currentInfo: Awaited<ReturnType<typeof getAdAccountInfo>> = null
  if (cfg.adAccountId) {
    currentInfo = await getAdAccountInfo()
  }

  return NextResponse.json({
    currentAdAccountId: cfg.adAccountId,
    currentInfo,
    availableAccounts: accounts,
    listError,
  })
}

/**
 * POST /api/admin/meta/ad-account
 * Body: { adAccountId: "act_XXXXX" }
 * Guarda el ad account elegido en MetaConfig.
 *
 * NOTA: no validamos que el adAccountId esté en /me/adaccounts porque
 * ese endpoint requiere User Access Token y nosotros guardamos solo el
 * Page Access Token. Validamos formato y dejamos que Meta rechace si el
 * page/business no tiene acceso a esa ad account cuando intentemos
 * crear una campaña. Hacemos un best-effort de probar acceso de lectura
 * acá para feedback temprano.
 */
const saveSchema = z.object({
  adAccountId: z.string().regex(/^act_\d+$/, "Formato esperado: act_XXXXXXX"),
})

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Best-effort: si listAdAccounts devuelve algo, validamos que esté.
  // Si la lista falla o está vacía (page token no soporta), confiamos
  // en el formato y Meta validará en uso.
  const accounts = await listAdAccounts().catch(() => [])
  const found =
    accounts.length > 0
      ? accounts.find((a) => a.id === parsed.data.adAccountId)
      : null

  await prisma.metaConfig.update({
    where: { id: "default" },
    data: {
      adAccountId: parsed.data.adAccountId,
      ...(found?.business ? { businessId: found.business.id } : {}),
    },
  })

  return NextResponse.json({ ok: true, adAccount: found, adAccountId: parsed.data.adAccountId })
}

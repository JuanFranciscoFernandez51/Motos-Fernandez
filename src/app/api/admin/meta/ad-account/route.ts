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

  // Validamos que el ad account elegido sea uno al que el user tiene
  // acceso (evita guardar uno random).
  const accounts = await listAdAccounts().catch(() => [])
  const found = accounts.find((a) => a.id === parsed.data.adAccountId)
  if (!found) {
    return NextResponse.json(
      {
        error: `No tenés acceso a la ad account ${parsed.data.adAccountId} con este token. Reconectá Meta o elegí una de la lista.`,
      },
      { status: 403 }
    )
  }

  await prisma.metaConfig.update({
    where: { id: "default" },
    data: {
      adAccountId: parsed.data.adAccountId,
      // Si el ad account viene con business, guardamos también
      ...(found.business ? { businessId: found.business.id } : {}),
    },
  })

  return NextResponse.json({ ok: true, adAccount: found })
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// In-memory rate limit: key = "ip:pagina", value = timestamp of last visit
const visitaCache = new Map<string, number>()
const RATE_LIMIT_MS = 30 * 60 * 1000 // 30 minutes

// Auto-cleanup every 30 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, ts] of visitaCache) {
    if (now - ts > RATE_LIMIT_MS) {
      visitaCache.delete(key)
    }
  }
}, RATE_LIMIT_MS)

function detectDevice(ua: string): string {
  if (/Tablet|iPad/i.test(ua)) return "tablet"
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile"
  return "desktop"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pagina: string = body?.pagina ?? "/"

    // Get IP for rate limiting (Vercel injects x-forwarded-for)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    const rateLimitKey = `${ip}:${pagina}`
    const now = Date.now()
    const lastVisit = visitaCache.get(rateLimitKey)

    if (lastVisit && now - lastVisit < RATE_LIMIT_MS) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    visitaCache.set(rateLimitKey, now)

    const ciudad = req.headers.get("x-vercel-ip-city") ?? null
    const userAgent = req.headers.get("user-agent") ?? ""
    const device = detectDevice(userAgent)

    await prisma.visita.create({
      data: {
        pagina,
        ciudad,
        ip,
        device,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

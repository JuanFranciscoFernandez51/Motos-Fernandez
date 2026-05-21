import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

/**
 * Conversions API server-side de Meta. Recibe eventos del helper
 * trackEvent del browser y los reenvía a graph.facebook.com con el
 * mismo event_id, para que Meta deduplique entre Pixel y CAPI.
 *
 * Lo importante:
 * - Manda a TODOS los pixel IDs que estén configurados (viejo
 *   NEXT_PUBLIC_FB_PIXEL_ID + nuevo NEXT_PUBLIC_META_PIXEL_ID)
 * - Hashea PII (email, telefono) con SHA-256 antes de mandar
 * - Captura IP y user-agent del request para matching server-side
 */

interface UserDataInput {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  city?: string
  zip?: string
}

interface CapiEvent {
  event_name: string
  event_id: string
  event_source_url: string
  custom_data?: Record<string, unknown>
  user_data?: UserDataInput
}

function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex")
}

function buildPixelIds(): string[] {
  const ids = [
    process.env.META_PIXEL_ID,
    process.env.NEXT_PUBLIC_META_PIXEL_ID,
    process.env.NEXT_PUBLIC_FB_PIXEL_ID,
  ]
  return Array.from(
    new Set(ids.filter((v): v is string => !!v && v.trim().length > 0))
  )
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = process.env.META_CAPI_ACCESS_TOKEN
    const pixelIds = buildPixelIds()

    if (!accessToken || pixelIds.length === 0) {
      // No configurado todavía. No es error — el Pixel browser ya disparó.
      return NextResponse.json({ skipped: true, reason: "capi_not_configured" })
    }

    const body = (await request.json()) as CapiEvent
    const {
      event_name,
      event_id,
      event_source_url,
      custom_data = {},
      user_data: rawUser = {},
    } = body

    if (!event_name || !event_id) {
      return NextResponse.json(
        { error: "event_name y event_id requeridos" },
        { status: 400 }
      )
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      ""
    const userAgent = request.headers.get("user-agent") || ""

    const userData: Record<string, unknown> = {
      client_ip_address: ip,
      client_user_agent: userAgent,
    }
    if (rawUser.email) userData.em = sha256(rawUser.email)
    if (rawUser.phone) {
      const onlyDigits = rawUser.phone.replace(/\D/g, "")
      if (onlyDigits) userData.ph = sha256(onlyDigits)
    }
    if (rawUser.first_name) userData.fn = sha256(rawUser.first_name)
    if (rawUser.last_name) userData.ln = sha256(rawUser.last_name)
    if (rawUser.city) userData.ct = sha256(rawUser.city)
    if (rawUser.zip) userData.zp = sha256(rawUser.zip)

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source: "website",
          user_data: userData,
          custom_data,
        },
      ],
    }

    const results = await Promise.allSettled(
      pixelIds.map((pixelId) =>
        fetch(
          `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        ).then(async (r) => ({
          pixelId,
          ok: r.ok,
          status: r.status,
          data: await r.json().catch(() => ({})),
        }))
      )
    )

    const summary = results.map((r) =>
      r.status === "fulfilled"
        ? { ok: r.value.ok, status: r.value.status, pixelId: r.value.pixelId }
        : { ok: false, error: String(r.reason) }
    )

    const anyError = summary.some((s) => !s.ok)
    if (anyError) {
      console.error("Meta CAPI partial failure:", summary, results)
    }

    return NextResponse.json({ success: !anyError, summary })
  } catch (err) {
    console.error("Meta CAPI route error:", err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}

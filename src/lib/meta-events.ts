"use client"

/**
 * Helper para disparar eventos a Meta (Pixel browser + Conversions API
 * server-side) con un mismo event_id para que Meta deduplique. Es lo
 * que pidió cowork para que el algoritmo de los Ads optimice bien aun
 * con bloqueadores / iOS 14.5+.
 *
 * Pixel browser ya está cargado en src/app/layout.tsx (uno o dos IDs
 * según las env vars NEXT_PUBLIC_FB_PIXEL_ID y NEXT_PUBLIC_META_PIXEL_ID).
 * Cuando hay dos pixels, fbq('track', ...) dispara a todos los pixels
 * inicializados.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Contact"
  | "InitiateCheckout"
  | "CompleteRegistration"
  | "Purchase"

export interface TrackEventOptions {
  event_name: MetaEventName
  custom_data?: Record<string, unknown>
  user_data?: {
    email?: string
    phone?: string
    first_name?: string
    last_name?: string
    city?: string
    zip?: string
  }
}

function makeEventId(name: string): string {
  const rand = Math.random().toString(36).slice(2, 11)
  return `${name}-${Date.now()}-${rand}`
}

/**
 * Dispara el evento en browser (Pixel) y en server (CAPI) con el mismo
 * event_id. Si CAPI falla, no rompe nada — el Pixel ya disparó.
 */
export async function trackEvent({
  event_name,
  custom_data = {},
  user_data = {},
}: TrackEventOptions): Promise<void> {
  if (typeof window === "undefined") return

  const event_id = makeEventId(event_name)
  const event_source_url = window.location.href

  // 1) Pixel browser — dispara en TODOS los pixels init (FB viejo + Meta nuevo)
  try {
    window.fbq?.("track", event_name, custom_data, { eventID: event_id })
  } catch {
    // ignorar
  }

  // 2) CAPI server-side con mismo event_id para dedup
  try {
    await fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name,
        event_id,
        event_source_url,
        custom_data,
        user_data,
      }),
      // keepalive para que sobreviva navegaciones (ej. click a wa.me)
      keepalive: true,
    })
  } catch {
    // ignorar — el Pixel ya disparó
  }
}

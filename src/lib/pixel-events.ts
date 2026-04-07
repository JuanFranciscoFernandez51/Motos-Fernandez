"use client"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

function getReferrerSource(): string {
  if (typeof window === "undefined") return "directo"
  const ref = document.referrer.toLowerCase()
  if (ref.includes("instagram")) return "Instagram"
  if (ref.includes("facebook") || ref.includes("fb.com")) return "Facebook"
  if (ref.includes("google")) return "Google"
  if (ref.includes("mercadolibre")) return "MercadoLibre"
  if (ref.includes(window.location.hostname)) return "interno"
  if (!ref) return "directo"
  return ref
}

async function trackConversion(evento: string, valor?: number, detalle?: string) {
  try {
    await fetch("/api/public/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento,
        valor,
        detalle,
        fuente: getReferrerSource(),
      }),
    })
  } catch {
    // Silent fail
  }
}

export function trackAddToCart(productName: string, value: number) {
  window.fbq?.("track", "AddToCart", { content_name: productName, value, currency: "ARS" })
  trackConversion("AddToCart", value, productName)
}

export function trackInitiateCheckout(value: number) {
  window.fbq?.("track", "InitiateCheckout", { value, currency: "ARS" })
  trackConversion("InitiateCheckout", value)
}

export function trackPurchase(orderId: string, value: number) {
  window.fbq?.("track", "Purchase", { value, currency: "ARS" })
  trackConversion("Purchase", value, orderId)
}

export function trackViewContent(name: string, value?: number) {
  window.fbq?.("track", "ViewContent", { content_name: name, value, currency: "ARS" })
  trackConversion("ViewContent", value, name)
}

export function trackLead(source: string) {
  window.fbq?.("track", "Lead", { content_name: source })
  trackConversion("Lead", undefined, source)
}

export function trackContact(method: string) {
  window.fbq?.("track", "Contact", { content_name: method })
  trackConversion("Contact", undefined, method)
}

export function trackSchedule(service: string) {
  window.fbq?.("track", "Schedule", { content_name: service })
  trackConversion("Schedule", undefined, service)
}

export function trackSearch(query: string) {
  window.fbq?.("track", "Search", { search_string: query })
  trackConversion("Search", undefined, query)
}

"use client"

import { useEffect } from "react"
import { trackPurchase } from "@/lib/pixel-events"

interface TrackPurchaseProps {
  paymentId?: string
  orderId?: string
}

export function TrackPurchase({ paymentId, orderId }: TrackPurchaseProps) {
  useEffect(() => {
    trackPurchase(orderId ?? paymentId ?? "unknown", 0)
  }, [])

  return null
}

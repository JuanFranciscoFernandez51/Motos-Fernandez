"use client"
import { useEffect } from "react"

export function TrackVisita({ pagina }: { pagina: string }) {
  useEffect(() => {
    fetch("/api/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagina }),
    }).catch(() => {})
  }, [pagina])
  return null
}

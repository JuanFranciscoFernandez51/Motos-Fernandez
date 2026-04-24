"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Cookie, X } from "lucide-react"

const STORAGE_KEY = "mf_cookie_consent_v1"

type ConsentState = "accepted" | "rejected" | null

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ConsentState | null
      if (!saved) {
        // Delay del banner así no molesta al cargar
        const timer = setTimeout(() => setVisible(true), 800)
        return () => clearTimeout(timer)
      }
      setConsent(saved)
    } catch {
      setVisible(true)
    }
  }, [])

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted")
    } catch {}
    setConsent("accepted")
    setVisible(false)
    // Dispara evento por si otras partes de la app quieren reaccionar
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: "accepted" }))
  }

  const handleReject = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "rejected")
    } catch {}
    setConsent("rejected")
    setVisible(false)
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: "rejected" }))
  }

  if (!visible || consent !== null) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-gray-200 dark:border-neutral-800 p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 shrink-0 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center">
            <Cookie className="size-5 text-[#6B4F7A]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
              Usamos cookies
            </h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el uso del sitio y mostrarte publicidad relevante. Podés aceptarlas o leer nuestra{" "}
              <Link href="/privacidad" className="text-[#6B4F7A] font-semibold underline">
                política de privacidad
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleAccept}
                className="inline-flex items-center justify-center rounded-lg bg-[#6B4F7A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
              >
                Aceptar todas
              </button>
              <button
                onClick={handleReject}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-[#6B4F7A] hover:text-[#6B4F7A] transition-colors"
              >
                Solo necesarias
              </button>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

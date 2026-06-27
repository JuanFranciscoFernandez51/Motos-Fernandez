"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, MessageCircle, Bike } from "lucide-react"
import { BUSINESS, getWhatsAppUrl, WHATSAPP_MESSAGES } from "@/lib/constants"
import { trackEvent } from "@/lib/meta-events"

/**
 * Página de gracias después de que un lead deja sus datos en una landing
 * de Meta Ads. Dispara CompleteRegistration (a Meta le sirve más que el
 * Lead a esta altura) para que el algoritmo aprenda con la conversión
 * final, no solo con el form submit.
 */

function GraciasContent() {
  const searchParams = useSearchParams()
  const modeloParam = searchParams?.get("modelo") || ""
  // Si el query trae slug/nombre del modelo, lo mostramos. Si no, genérico.
  const modeloNombre = modeloParam
    ? modeloParam.replace(/[-_]/g, " ").toUpperCase()
    : ""

  useEffect(() => {
    void trackEvent({
      event_name: "CompleteRegistration",
      custom_data: {
        content_name: modeloNombre || "consulta_generica",
        page: "thank_you",
      },
    })
  }, [modeloNombre])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl text-center">
        <div className="inline-flex items-center justify-center size-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-6">
          <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          ¡Gracias! Te contactamos en breve.
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-gray-300 leading-relaxed">
          {modeloNombre ? (
            <>
              Recibimos tu consulta por la <strong>{modeloNombre}</strong>. Te
              respondemos por WhatsApp en menos de 1 hora hábil.
            </>
          ) : (
            <>
              Recibimos tu consulta. Te respondemos por WhatsApp en menos de 1
              hora hábil.
            </>
          )}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={getWhatsAppUrl(WHATSAPP_MESSAGES.general)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe57] px-5 py-3 text-base font-bold text-white shadow-lg"
          >
            <MessageCircle className="size-5" />
            Mientras tanto, escribinos
          </a>
          <a
            href={BUSINESS.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 dark:border-neutral-700 hover:border-gray-400 px-5 py-3 text-base font-semibold text-gray-800 dark:text-gray-200"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
            Seguinos en Instagram
          </a>
        </div>

        <Link
          href="/catalogo"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#7C3AED] dark:text-[#C8C8D0] hover:underline font-semibold"
        >
          <Bike className="size-4" />
          Ver el resto del catálogo
        </Link>
      </div>
    </div>
  )
}

export default function GraciasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 text-gray-500">
          Cargando…
        </div>
      }
    >
      <GraciasContent />
    </Suspense>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot } from "lucide-react"

/**
 * Botón flotante violeta abajo a la derecha que lleva al Asistente IA.
 * Se oculta cuando el usuario YA está en la página del asistente.
 */
export function AdminFloatingAssistant() {
  const pathname = usePathname()

  // Ocultar en la página del asistente
  if (pathname.startsWith("/admin/asistente")) return null

  return (
    <Link
      href="/admin/asistente"
      title="Asistente IA"
      aria-label="Asistente IA"
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-[#3D2649] to-[#7C3AED] text-white shadow-violeta-glow hover:shadow-2xl transition-all hover:-translate-y-0.5 px-4 py-3 sm:px-5 sm:py-3.5"
    >
      <span className="relative flex">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-white/30 animate-ping opacity-40"
        />
        <Bot className="relative size-5" />
      </span>
      <span className="hidden sm:inline text-sm font-semibold">Asistente IA</span>
    </Link>
  )
}

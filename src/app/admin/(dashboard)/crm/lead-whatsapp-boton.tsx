"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, Loader2 } from "lucide-react"
import { getWhatsAppUrlForClient } from "@/lib/constants"

/**
 * Botón compacto para la lista del CRM: genera el mensaje con IA y abre
 * WhatsApp con el texto pre-armado (no auto-genera al cargar la lista, para no
 * disparar una llamada por cada fila). Registra la interacción al enviar.
 */
export function LeadWhatsappBoton({
  leadId,
  telefono,
}: {
  leadId: string
  telefono: string | null
}) {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  const responder = async () => {
    if (!telefono) { alert("Este lead no tiene teléfono cargado"); return }
    setCargando(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/mensaje-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.mensaje) { alert(d.error || "No se pudo generar"); return }
      // Abre WhatsApp con el mensaje listo (se revisa/edita antes de enviar).
      window.open(getWhatsAppUrlForClient(telefono, d.mensaje), "_blank", "noopener,noreferrer")
      // Registra la interacción y marca como contactado.
      await fetch(`/api/admin/leads/${leadId}/registrar-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: d.mensaje }),
      })
      router.refresh()
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={responder}
      disabled={cargando || !telefono}
      title={telefono ? "Responder con IA por WhatsApp" : "Sin teléfono"}
      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2 py-1 text-xs font-medium hover:bg-emerald-700 disabled:opacity-40"
    >
      {cargando ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
      IA
    </button>
  )
}

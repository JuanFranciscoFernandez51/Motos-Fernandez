"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Send, RefreshCw } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { getWhatsAppUrlForClient } from "@/lib/constants"

export function LeadWhatsappIA({
  leadId,
  telefono,
  modo = "nuevo",
  registrarEnviado,
}: {
  leadId: string
  telefono: string | null
  modo?: "nuevo" | "recontacto"
  registrarEnviado: (leadId: string, contenido: string) => Promise<void>
}) {
  const router = useRouter()
  const [mensaje, setMensaje] = useState("")
  const [generando, setGenerando] = useState(false)
  const [, startTransition] = useTransition()
  const yaGenero = useRef(false)

  // Genera la respuesta automáticamente al abrir el lead (una sola vez).
  useEffect(() => {
    if (yaGenero.current) return
    yaGenero.current = true
    generar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generar = async () => {
    setGenerando(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/mensaje-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { alert(d.error || "No se pudo generar"); return }
      setMensaje(d.mensaje || "")
    } finally {
      setGenerando(false)
    }
  }

  const enviar = () => {
    if (!telefono) { alert("Este lead no tiene teléfono cargado"); return }
    if (!mensaje.trim()) return
    window.open(getWhatsAppUrlForClient(telefono, mensaje), "_blank", "noopener,noreferrer")
    // Registra la interacción y marca el lead como contactado.
    startTransition(async () => {
      await registrarEnviado(leadId, mensaje)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {!mensaje ? (
        generando ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
            <Loader2 className="size-4 animate-spin text-[#7C3AED]" />
            {modo === "recontacto" ? "Generando re-contacto…" : "Generando respuesta…"}
          </div>
        ) : (
          <button
            type="button"
            onClick={generar}
            className="inline-flex items-center gap-2 rounded-md bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white hover:bg-[#9D5CF0]"
          >
            <Sparkles className="size-4" />
            {modo === "recontacto" ? "Redactar re-contacto con IA" : "Redactar respuesta con IA"}
          </button>
        )
      ) : (
        <>
          <Textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={5} className="text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={enviar}
              disabled={!telefono}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              title={telefono ? "Abre WhatsApp con el mensaje listo" : "Sin teléfono"}
            >
              <Send className="size-4" /> Enviar por WhatsApp
            </button>
            <button
              type="button"
              onClick={generar}
              disabled={generando}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
            >
              {generando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Otra versión
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Revisá y editá antes de enviar. Al enviar se registra la interacción.</p>
        </>
      )}
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import {
  Bot,
  Send,
  User,
  RotateCcw,
  Sparkles,
  Paperclip,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import Image from "next/image"

// ==================== TIPOS ====================

type ImageBlock = {
  type: "image"
  source: {
    type: "base64"
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    data: string
  }
}

type ContentBlock =
  | { type: "text"; text: string }
  | ImageBlock

interface Message {
  role: "user" | "assistant"
  // Texto plano para mensajes simples; array de blocks cuando hay imágenes
  content: string | ContentBlock[]
  // Si está pendiente la confirmación de creación, va el preview
  preview?: PreviewPropuesta
}

type EntidadPreview = "cliente" | "proveedor" | "modelo" | "mandato" | "orden_compra"

interface PreviewPropuesta {
  entidad: EntidadPreview
  datos: Record<string, unknown>
  estado: "pendiente" | "creando" | "creado" | "descartado" | "error"
  resultadoId?: string
  error?: string
}

const QUICK_QUESTIONS = [
  "¿Cuántos pedidos hay hoy?",
  "Resumen de ventas del mes",
  "Productos con poco stock",
  "Turnos pendientes",
]

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hola! Soy tu asistente de Motos Fernandez.\n\nPodés:\n- Consultar datos en tiempo real (pedidos, ventas, stock, leads, turnos)\n- Crear clientes, proveedores, motos, mandatos de venta y órdenes de compra diciéndome los datos\n- 📎 Subir foto de un DNI o factura y yo extraigo los datos\n\nSiempre te muestro una preview antes de guardar nada.",
}

const ENTIDAD_LABELS: Record<EntidadPreview, string> = {
  cliente: "cliente",
  proveedor: "proveedor",
  modelo: "modelo (moto)",
  mandato: "mandato de venta",
  orden_compra: "orden de compra",
}

// ==================== HELPERS ====================

function fileToImageBlock(file: File): Promise<ImageBlock> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result tiene la forma "data:image/jpeg;base64,XXXXX"
      const match = result.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) {
        reject(new Error("Imagen inválida"))
        return
      }
      const mime = match[1] as ImageBlock["source"]["media_type"]
      const data = match[2]
      resolve({
        type: "image",
        source: { type: "base64", media_type: mime, data },
      })
    }
    reader.onerror = () => reject(new Error("Error leyendo imagen"))
    reader.readAsDataURL(file)
  })
}

// Para mostrar la imagen en el chat (data URL legible)
function imageBlockToDataUrl(block: ImageBlock): string {
  return `data:${block.source.media_type};base64,${block.source.data}`
}

// ==================== COMPONENTE ====================

export function AsistenteChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState("")
  const [pendingImage, setPendingImage] = useState<ImageBlock | null>(null)
  const [pendingImageName, setPendingImageName] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function resetConversation() {
    setMessages([INITIAL_MESSAGE])
    setInput("")
    setPendingImage(null)
    setPendingImageName("")
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es muy grande (máximo 5MB)")
      return
    }
    try {
      const block = await fileToImageBlock(file)
      setPendingImage(block)
      setPendingImageName(file.name)
    } catch {
      alert("No se pudo procesar la imagen")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function sendMessage() {
    if (loading) return
    const text = input.trim()
    // Permitir enviar solo imagen sin texto
    if (!text && !pendingImage) return

    // Construir el contenido del mensaje
    let userContent: string | ContentBlock[]
    if (pendingImage) {
      const blocks: ContentBlock[] = []
      if (text) blocks.push({ type: "text", text })
      else blocks.push({ type: "text", text: "Analizá esta imagen y extraé los datos." })
      blocks.push(pendingImage)
      userContent = blocks
    } else {
      userContent = text
    }

    const userMessage: Message = { role: "user", content: userContent }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setPendingImage(null)
    setPendingImageName("")
    setLoading(true)

    // Agregar placeholder del asistente
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (response.status === 401) {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: "No autorizado. Por favor, iniciá sesión nuevamente.",
          }
          return updated
        })
        return
      }

      if (!response.ok || !response.body) {
        throw new Error("Error en la respuesta")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Procesar líneas completas (NDJSON)
        const lineas = buffer.split("\n")
        buffer = lineas.pop() || "" // dejar lo último incompleto

        for (const linea of lineas) {
          if (!linea.trim()) continue
          try {
            const evento = JSON.parse(linea)
            if (evento.type === "text") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === "assistant" && typeof last.content === "string") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + evento.text,
                  }
                }
                return updated
              })
            } else if (evento.type === "preview") {
              // Adjuntar la preview al último mensaje del asistente
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    preview: {
                      entidad: evento.entidad,
                      datos: evento.datos,
                      estado: "pendiente",
                    },
                  }
                }
                return updated
              })
            }
          } catch {
            // Línea con JSON inválido — ignorar
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Hubo un error al procesar la consulta. Intentá de nuevo.",
        }
        return updated
      })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Confirmar creación de una preview
  async function confirmarPreview(messageIdx: number) {
    const msg = messages[messageIdx]
    if (!msg.preview || msg.preview.estado !== "pendiente") return

    // Marcar como creando
    setMessages((prev) => {
      const updated = [...prev]
      const m = updated[messageIdx]
      if (m.preview) {
        updated[messageIdx] = {
          ...m,
          preview: { ...m.preview, estado: "creando" },
        }
      }
      return updated
    })

    try {
      const res = await fetch(`/api/admin/crear/${msg.preview.entidad}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg.preview.datos),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setMessages((prev) => {
          const updated = [...prev]
          const m = updated[messageIdx]
          if (m.preview) {
            updated[messageIdx] = {
              ...m,
              preview: {
                ...m.preview,
                estado: "error",
                error: data?.error || "Error al crear",
              },
            }
          }
          return updated
        })
        return
      }
      // Éxito
      setMessages((prev) => {
        const updated = [...prev]
        const m = updated[messageIdx]
        if (m.preview) {
          updated[messageIdx] = {
            ...m,
            preview: {
              ...m.preview,
              estado: "creado",
              resultadoId: data.id,
            },
          }
        }
        return updated
      })
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        const m = updated[messageIdx]
        if (m.preview) {
          updated[messageIdx] = {
            ...m,
            preview: { ...m.preview, estado: "error", error: "Error de conexión" },
          }
        }
        return updated
      })
    }
  }

  function descartarPreview(messageIdx: number) {
    setMessages((prev) => {
      const updated = [...prev]
      const m = updated[messageIdx]
      if (m.preview) {
        updated[messageIdx] = {
          ...m,
          preview: { ...m.preview, estado: "descartado" },
        }
      }
      return updated
    })
  }

  const showQuickQuestions = messages.length === 1

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#6B4F7A] flex items-center justify-center shadow-sm">
            <Bot className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Asistente IA
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consultá datos, creá clientes/proveedores/motos y procesá fotos de DNI o facturas
            </p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={resetConversation}
            disabled={loading}
            title="Nueva conversación"
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#6B4F7A] border border-gray-200 dark:border-neutral-800 hover:border-[#6B4F7A] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" />
            Nueva consulta
          </button>
        )}
      </div>

      {/* Chat container */}
      <div className="flex flex-col flex-1 bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              messageIdx={i}
              onConfirm={() => confirmarPreview(i)}
              onDiscard={() => descartarPreview(i)}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick questions */}
        {showQuickQuestions && (
          <div className="px-4 pb-3 border-t border-gray-50 pt-3">
            <p className="text-xs text-gray-400 mb-2 font-medium flex items-center gap-1">
              <Sparkles className="size-3" />
              Sugerencias
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    setTimeout(() => sendMessage(), 0)
                  }}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#6B4F7A]/40 text-[#6B4F7A] hover:bg-[#6B4F7A] hover:text-white hover:border-[#6B4F7A] transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Imagen pendiente */}
        {pendingImage && (
          <div className="mx-4 mb-2 mt-3 flex items-center gap-3 rounded-lg border border-[#6B4F7A]/30 bg-[#6B4F7A]/5 p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageBlockToDataUrl(pendingImage)}
              alt="Adjunto"
              className="size-12 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#6B4F7A] uppercase tracking-wider">
                Imagen lista
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                {pendingImageName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingImage(null)
                setPendingImageName("")
              }}
              className="text-gray-400 hover:text-red-500"
              aria-label="Quitar imagen"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-neutral-800"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            title="Adjuntar imagen (DNI, factura, etc.)"
            className="size-10 rounded-xl border border-gray-200 dark:border-neutral-800 text-gray-500 dark:text-gray-400 hover:text-[#6B4F7A] hover:border-[#6B4F7A] flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Paperclip className="size-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingImage
                ? "Agregá un comentario (opcional) o enviá la imagen..."
                : "Consultá, creá un cliente, subí un DNI..."
            }
            disabled={loading}
            className="flex-1 text-sm bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none focus:border-[#6B4F7A] focus:ring-1 focus:ring-[#6B4F7A] disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !pendingImage)}
            className="size-10 rounded-xl bg-[#6B4F7A] text-white flex items-center justify-center hover:bg-[#7d5d8e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Enviar"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

// ==================== BUBBLE ====================

function MessageBubble({
  msg,
  messageIdx,
  onConfirm,
  onDiscard,
}: {
  msg: Message
  messageIdx: number
  onConfirm: () => void
  onDiscard: () => void
}) {
  const isUser = msg.role === "user"

  // Renderizar el contenido (texto o blocks con imágenes)
  const renderContent = () => {
    if (typeof msg.content === "string") {
      return msg.content || (
        <span className="flex gap-1 items-center py-1">
          <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
        </span>
      )
    }
    return (
      <div className="space-y-2">
        {msg.content.map((b, i) => {
          if (b.type === "text") return <p key={i}>{b.text}</p>
          if (b.type === "image")
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={imageBlockToDataUrl(b)}
                alt="Imagen adjunta"
                className="max-w-full max-h-64 rounded-lg"
              />
            )
          return null
        })}
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="size-7 rounded-full bg-[#6B4F7A] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="size-3.5 text-white" />
        </div>
      )}

      <div className="max-w-[78%] space-y-2">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-[#6B4F7A] text-white rounded-br-sm"
              : "bg-gray-50 dark:bg-neutral-900 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-neutral-800"
          }`}
        >
          {renderContent()}
        </div>

        {/* Preview card para creación */}
        {!isUser && msg.preview && (
          <PreviewCard
            preview={msg.preview}
            messageIdx={messageIdx}
            onConfirm={onConfirm}
            onDiscard={onDiscard}
          />
        )}
      </div>

      {isUser && (
        <div className="size-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="size-3.5 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  )
}

// ==================== PREVIEW CARD ====================

function PreviewCard({
  preview,
  onConfirm,
  onDiscard,
}: {
  preview: PreviewPropuesta
  messageIdx: number
  onConfirm: () => void
  onDiscard: () => void
}) {
  const { entidad, datos, estado } = preview
  const titulo = ENTIDAD_LABELS[entidad]

  // Estados terminales
  if (estado === "creado") {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-300" />
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            ✅ {titulo.charAt(0).toUpperCase() + titulo.slice(1)} creado correctamente
          </p>
        </div>
        {preview.resultadoId && (
          <p className="text-xs text-emerald-600/80 dark:text-emerald-300/80 mt-1.5 font-mono">
            ID: {preview.resultadoId}
          </p>
        )}
      </div>
    )
  }

  if (estado === "descartado") {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-3 text-xs text-gray-500 italic">
        Propuesta descartada.
      </div>
    )
  }

  if (estado === "error") {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-4">
        <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">
          ❌ Error al crear el {titulo}
        </p>
        <p className="text-xs text-red-600 dark:text-red-300">{preview.error || "Intentá de nuevo"}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-[#6B4F7A]/40 bg-gradient-to-br from-[#6B4F7A]/5 to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#6B4F7A] uppercase tracking-wider">
          📋 Propuesta — Crear {titulo}
        </p>
      </div>

      {/* Datos extraídos */}
      <div className="rounded-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-3 space-y-1.5">
        {Object.entries(datos).map(([key, value]) => (
          <PreviewField key={key} label={key} value={value} />
        ))}
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={estado === "creando"}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50"
        >
          {estado === "creando" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Confirmar y crear
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={estado === "creando"}
          className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
        >
          Descartar
        </button>
      </div>

      <p className="text-[10px] text-gray-400 italic">
        💡 Si algún dato está mal, descartá y pedile al asistente que corrija.
      </p>
    </div>
  )
}

function PreviewField({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null

  // Array (contactos, cuentasBancarias)
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return (
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {label} ({value.length})
        </p>
        <div className="mt-1 space-y-1.5">
          {value.map((item, i) => (
            <div
              key={i}
              className="rounded-md bg-gray-50 dark:bg-neutral-900 p-2 text-xs space-y-0.5 border border-gray-100 dark:border-neutral-800"
            >
              {typeof item === "object" && item !== null
                ? Object.entries(item)
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .map(([k, v]) => (
                      <p key={k}>
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          {k}:
                        </span>{" "}
                        <span className="text-gray-800 dark:text-gray-200">{String(v)}</span>
                      </p>
                    ))
                : String(item)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Valor simple
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-xs text-gray-800 dark:text-gray-200 font-medium sm:text-right break-all">
        {String(value)}
      </p>
    </div>
  )
}

// Suprimir warning de Image no usado
void Image

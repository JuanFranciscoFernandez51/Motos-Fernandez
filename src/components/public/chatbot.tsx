"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Hola! Soy el asistente de Motos Fernandez. ¿En qué te puedo ayudar?",
}

type ParserMatch = {
  type: "image" | "link" | "bold" | "strike"
  index: number
  length: number
  group1: string
  group2?: string
}

function findNextMatch(text: string): ParserMatch | null {
  // Buscamos todos los tipos de marca y elegimos el que aparece primero.
  // Orden de chequeo: imagen antes que link (la imagen empieza con "!" + link pattern).
  const imageRe = /!\[([^\]]*)\]\(([^\s)]+)\)/
  const linkRe = /\[([^\]]+)\]\(([^\s)]+)\)/
  const boldRe = /\*\*([^*\n]+)\*\*/
  const strikeRe = /~~([^~\n]+)~~/

  const imageM = imageRe.exec(text)
  const linkM = linkRe.exec(text)
  const boldM = boldRe.exec(text)
  const strikeM = strikeRe.exec(text)

  const candidates: ParserMatch[] = []

  if (imageM) {
    candidates.push({
      type: "image",
      index: imageM.index,
      length: imageM[0].length,
      group1: imageM[1],
      group2: imageM[2],
    })
  }
  if (linkM) {
    // Descartar si este link cae justo dentro del syntax de una imagen: "![...](...)"
    // en ese caso, el linkM.index === imageM.index + 1
    const insideImage = imageM && linkM.index === imageM.index + 1
    if (!insideImage) {
      candidates.push({
        type: "link",
        index: linkM.index,
        length: linkM[0].length,
        group1: linkM[1],
        group2: linkM[2],
      })
    }
  }
  if (boldM) {
    candidates.push({
      type: "bold",
      index: boldM.index,
      length: boldM[0].length,
      group1: boldM[1],
    })
  }
  if (strikeM) {
    candidates.push({
      type: "strike",
      index: strikeM.index,
      length: strikeM[0].length,
      group1: strikeM[1],
    })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.index - b.index)
  return candidates[0]
}

function formatMessage(text: string) {
  // Parsear markdown básico a JSX
  const lines = text.split("\n")
  return lines.map((line, lineIdx) => {
    const parts: (string | React.ReactElement)[] = []
    let remaining = line
    let keyIdx = 0

    while (remaining.length > 0) {
      const match = findNextMatch(remaining)

      if (!match) {
        parts.push(remaining)
        break
      }

      // Texto antes del match
      if (match.index > 0) {
        parts.push(remaining.slice(0, match.index))
      }

      if (match.type === "image") {
        const alt = match.group1 || "Imagen"
        const src = match.group2 || ""
        parts.push(
          <span key={`i-${lineIdx}-${keyIdx++}`} className="block my-1.5">
            <img
              src={src}
              alt={alt}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none"
              }}
              className="max-w-[200px] w-full h-auto rounded-lg shadow-sm border border-gray-200 object-cover"
            />
          </span>
        )
      } else if (match.type === "link") {
        const href = match.group2 || "#"
        const isInternal = href.startsWith("/")
        parts.push(
          <a
            key={`l-${lineIdx}-${keyIdx++}`}
            href={href}
            target={isInternal ? "_self" : "_blank"}
            rel={isInternal ? undefined : "noopener noreferrer"}
            className="text-[#6B4F7A] font-medium underline underline-offset-2 hover:text-[#8B6F9A]"
          >
            {match.group1}
          </a>
        )
      } else if (match.type === "bold") {
        parts.push(<strong key={`b-${lineIdx}-${keyIdx++}`}>{match.group1}</strong>)
      } else if (match.type === "strike") {
        parts.push(
          <s key={`s-${lineIdx}-${keyIdx++}`} className="text-gray-400">
            {match.group1}
          </s>
        )
      }

      remaining = remaining.slice(match.index + match.length)
    }

    return (
      <span key={`line-${lineIdx}`}>
        {lineIdx > 0 && <br />}
        {parts}
      </span>
    )
  })
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, loading])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: "user", content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    // Agregar placeholder del asistente
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        throw new Error("Error en la respuesta")
      }

      const data = await response.json()
      const reply = data.reply ?? "Lo siento, no pude procesar tu consulta."

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "assistant", content: reply }
        return updated
      })
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Lo siento, hubo un error. Podés contactarnos por WhatsApp al 291 578-8671.",
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel de chat */}
      {open && (
        <div className="w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-white">Asistente Motos Fernandez</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Cerrar chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#6B4F7A] text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  {msg.content ? formatMessage(msg.content) : (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu consulta..."
              disabled={loading}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#6B4F7A] focus:ring-1 focus:ring-[#6B4F7A] disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="size-9 rounded-xl bg-[#6B4F7A] text-white flex items-center justify-center hover:bg-[#8B6F9A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Enviar mensaje"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="size-14 rounded-full bg-[#6B4F7A] text-white shadow-lg flex items-center justify-center hover:bg-[#8B6F9A] transition-all hover:scale-110 active:scale-95"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
      >
        {open ? <X className="size-6" /> : <MessageSquare className="size-7" />}
      </button>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, User, RotateCcw, Sparkles } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const QUICK_QUESTIONS = [
  "¿Cuántos pedidos hay hoy?",
  "¿Cuáles son los últimos leads?",
  "¿Qué turnos están pendientes?",
  "Estadísticas generales",
  "Productos con poco stock",
  "Resumen de ventas del mes",
]

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hola! Soy tu asistente de gestión de Motos Fernandez.\n\nPuedo consultarte datos en tiempo real sobre pedidos, leads, turnos, stock y ventas. Usá los accesos rápidos o escribí tu consulta directamente.",
}

export function AsistenteChat() {
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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function resetConversation() {
    setMessages([INITIAL_MESSAGE])
    setInput("")
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
          }
          return updated
        })
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Asistente IA</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Consultá datos de la tienda en tiempo real</p>
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
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="size-7 rounded-full bg-[#6B4F7A] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="size-3.5 text-white" />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#6B4F7A] text-white rounded-br-sm"
                    : "bg-gray-50 dark:bg-neutral-900 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-neutral-800"
                }`}
              >
                {msg.content || (
                  <span className="flex gap-1 items-center py-1">
                    <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                )}
              </div>

              {msg.role === "user" && (
                <div className="size-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="size-3.5 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Preguntas rápidas — solo con el mensaje inicial */}
        {showQuickQuestions && (
          <div className="px-4 pb-3 border-t border-gray-50 pt-3">
            <p className="text-xs text-gray-400 mb-2 font-medium flex items-center gap-1">
              <Sparkles className="size-3" />
              Accesos rápidos
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#6B4F7A]/40 text-[#6B4F7A] hover:bg-[#6B4F7A] hover:text-white hover:border-[#6B4F7A] transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-neutral-800"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Consultá pedidos, turnos, leads, stock..."
            disabled={loading}
            className="flex-1 text-sm bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 outline-none focus:border-[#6B4F7A] focus:ring-1 focus:ring-[#6B4F7A] disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="size-10 rounded-xl bg-[#6B4F7A] text-white flex items-center justify-center hover:bg-[#7d5d8e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Enviar"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

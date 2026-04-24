"use client"

import { useState, FormEvent } from "react"
import { Check, Loader2, Send } from "lucide-react"

type Status = "idle" | "loading" | "success" | "error"

interface NewsletterFormProps {
  origen?: string
}

export function NewsletterForm({ origen = "footer" }: NewsletterFormProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState<string>("")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === "loading") return

    const trimmed = email.trim()
    if (!trimmed) {
      setStatus("error")
      setMessage("Ingresá un email")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, origen }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus("error")
        setMessage(data?.error || "No pudimos suscribirte. Probá de nuevo.")
        return
      }

      setStatus("success")
      setMessage(data?.message || "¡Listo! Te suscribiste correctamente.")
      setEmail("")
    } catch {
      setStatus("error")
      setMessage("Error de conexión. Intentá de nuevo.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === "error" || status === "success") {
              setStatus("idle")
              setMessage("")
            }
          }}
          placeholder="Tu email"
          disabled={status === "loading" || status === "success"}
          className="flex-1 min-w-0 rounded-md border border-white/10 bg-white/5 dark:bg-neutral-900/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 dark:text-gray-400 focus:border-[#9B59B6] focus:outline-none focus:ring-1 focus:ring-[#9B59B6] disabled:opacity-60"
          aria-label="Email para suscripción al newsletter"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enviando...
            </>
          ) : status === "success" ? (
            <>
              <Check className="size-4" />
              Suscripto
            </>
          ) : (
            <>
              <Send className="size-4" />
              Suscribirme
            </>
          )}
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 text-xs ${
            status === "success"
              ? "text-emerald-400"
              : status === "error"
                ? "text-red-400"
                : "text-gray-400"
          }`}
          role={status === "error" ? "alert" : undefined}
        >
          {status === "success" && (
            <Check className="inline size-3 mr-1 -mt-0.5" />
          )}
          {message}
        </p>
      )}
    </form>
  )
}

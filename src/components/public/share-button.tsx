"use client"

import { useState } from "react"
import { Share2, Check, Copy, MessageCircle, Send } from "lucide-react"

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  )
}

interface ShareButtonProps {
  title: string
  text?: string
  path: string // path relativo, ej: /catalogo/honda-xr
  variant?: "icon" | "full"
  className?: string
}

export function ShareButton({ title, text, path, variant = "full", className = "" }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${path}`
    : `https://motos-fernandez.vercel.app${path}`

  const shareText = text || title

  const handleClick = async () => {
    // Web Share API (móviles)
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text: shareText, url: fullUrl })
        return
      } catch {
        // Usuario canceló o no soportado, caer al menú manual
      }
    }
    setOpen(!open)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // no-op
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`

  return (
    <div className={`relative inline-block ${className}`}>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Compartir"
          className="inline-flex items-center justify-center size-9 rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-300 hover:text-[#6B4F7A] hover:border-[#6B4F7A] transition-colors"
        >
          <Share2 className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-[#6B4F7A] hover:border-[#6B4F7A] transition-colors"
        >
          <Share2 className="size-4" />
          Compartir
        </button>
      )}

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Popover */}
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-gray-100 dark:border-neutral-800 p-2 z-50">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900 text-sm text-gray-700 dark:text-gray-300"
              onClick={() => setOpen(false)}
            >
              <span className="size-8 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <MessageCircle className="size-4 text-[#25D366]" />
              </span>
              WhatsApp
            </a>
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900 text-sm text-gray-700 dark:text-gray-300"
              onClick={() => setOpen(false)}
            >
              <span className="size-8 rounded-full bg-[#0088cc]/10 flex items-center justify-center">
                <Send className="size-4 text-[#0088cc]" />
              </span>
              Telegram
            </a>
            <a
              href={facebookHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900 text-sm text-gray-700 dark:text-gray-300"
              onClick={() => setOpen(false)}
            >
              <span className="size-8 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                <FacebookIcon className="size-4 text-[#1877F2]" />
              </span>
              Facebook
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-900 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="size-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4 text-gray-600 dark:text-gray-300" />
                )}
              </span>
              {copied ? "¡Copiado!" : "Copiar link"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

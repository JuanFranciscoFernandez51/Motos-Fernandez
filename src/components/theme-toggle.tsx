"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"

/**
 * Toggle sutil para el navbar público (solo 1 ícono que cambia).
 * Cicla light ↔ dark (no muestra 'system' para no confundir).
 */
export function ThemeToggleSubtle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) {
    // Evita hydration mismatch — renderiza placeholder del mismo tamaño
    return <div className={`size-9 ${className}`} />
  }

  const isDark = resolvedTheme === "dark"
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className={`inline-flex items-center justify-center size-9 rounded-md transition-colors ${className}`}
    >
      {isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  )
}

/**
 * Toggle visible con 3 botones (light / dark / system) para el admin.
 */
export function ThemeToggleSegmented() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return <div className="h-9 w-24" />
  }

  const opts: {
    value: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ]

  return (
    <div className="inline-flex items-center rounded-md border border-neutral-700 bg-neutral-900 p-0.5">
      {opts.map((o) => {
        const Icon = o.icon
        const active = theme === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            title={o.label}
            className={`inline-flex items-center justify-center size-7 rounded transition-colors ${
              active
                ? "bg-[#6B4F7A] text-white"
                : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            }`}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}

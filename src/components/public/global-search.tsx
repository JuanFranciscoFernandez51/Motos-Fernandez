"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, X, Loader2, Bike, ShoppingBag, Newspaper, Globe } from "lucide-react"
import { formatPrice } from "@/lib/constants"

type SearchScope = "todo" | "0km" | "disponibles" | "tienda"

type SearchItem = {
  tipo: "0km" | "disponible" | "producto" | "noticia"
  titulo: string
  subtitulo: string
  precio: number | null
  imagen: string | null
  url: string
}

const TIPO_META: Record<SearchItem["tipo"], { label: string; Icon: typeof Bike }> = {
  "0km": { label: "0KM", Icon: Bike },
  disponible: { label: "Disponible", Icon: Bike },
  producto: { label: "Tienda", Icon: ShoppingBag },
  noticia: { label: "Noticia", Icon: Newspaper },
}

const PLACEHOLDER: Record<SearchScope, string> = {
  todo: "Buscá motos, productos, noticias…",
  "0km": "Buscá en 0KM… (marca, modelo, cilindrada)",
  disponibles: "Buscá en unidades disponibles…",
  tienda: "Buscá en la tienda… (casco, accesorio, repuesto)",
}

export function GlobalSearch({
  scope: scopeInicial = "todo",
  autoFocus = false,
  className = "",
}: {
  scope?: SearchScope
  autoFocus?: boolean
  className?: string
}) {
  const router = useRouter()
  const [scope, setScope] = useState<SearchScope>(scopeInicial)
  const [q, setQ] = useState("")
  const [resultados, setResultados] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const buscar = useCallback(
    async (texto: string, sc: SearchScope) => {
      if (texto.trim().length < 2) {
        setResultados([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(texto)}&scope=${sc}`
        )
        const data = await res.json()
        setResultados(Array.isArray(data.resultados) ? data.resultados : [])
      } catch {
        setResultados([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => buscar(q, scope), 250)
    return () => clearTimeout(t)
  }, [q, scope, buscar])

  // Cerrar al clickear afuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const irA = (item: SearchItem) => {
    setAbierto(false)
    router.push(item.url)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setAbierto(false)
      inputRef.current?.blur()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && activo >= 0 && resultados[activo]) {
      e.preventDefault()
      irA(resultados[activo])
    }
  }

  const mostrarDropdown = abierto && q.trim().length >= 2
  const puedeAmpliar = scope !== "todo"

  return (
    <div
      ref={boxRef}
      className={`relative w-full ${mostrarDropdown ? "z-40" : ""} ${className}`}
    >
      {/* Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setAbierto(true)
            setActivo(-1)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={PLACEHOLDER[scope]}
          aria-label="Buscar en la web"
          className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-12 pr-11 py-3.5 text-[15px] text-neutral-900 dark:text-neutral-100 shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        {q && (
          <button
            onClick={() => {
              setQ("")
              setResultados([])
              inputRef.current?.focus()
            }}
            aria-label="Limpiar"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {mostrarDropdown && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {puedeAmpliar && (
            <button
              onClick={() => setScope("todo")}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 border-b border-neutral-100 dark:border-neutral-800"
            >
              <Globe className="w-4 h-4" /> Buscar en toda la web
            </button>
          )}

          {resultados.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-neutral-500">
              No encontramos nada para <span className="font-semibold">«{q}»</span>.
              <br />
              Probá con otra palabra{puedeAmpliar ? " o buscá en toda la web" : ""}.
            </div>
          )}

          {loading && resultados.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-neutral-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando…
            </div>
          )}

          <ul className="py-1">
            {resultados.map((item, i) => {
              const { label, Icon } = TIPO_META[item.tipo]
              return (
                <li key={item.url + i}>
                  <Link
                    href={item.url}
                    onClick={() => setAbierto(false)}
                    onMouseEnter={() => setActivo(i)}
                    className={`flex items-center gap-3 px-3 py-2.5 ${
                      activo === i
                        ? "bg-violet-50 dark:bg-violet-950/40"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      {item.imagen ? (
                        <Image
                          src={item.imagen}
                          alt={item.titulo}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <Icon className="w-6 h-6 text-neutral-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                          <Icon className="w-3 h-3" /> {label}
                        </span>
                      </div>
                      <p className="truncate font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {item.titulo}
                      </p>
                      <p className="truncate text-xs text-neutral-500">{item.subtitulo}</p>
                    </div>
                    {item.precio ? (
                      <div className="shrink-0 font-bold text-violet-700 dark:text-violet-300 text-sm">
                        {formatPrice(item.precio)}
                      </div>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

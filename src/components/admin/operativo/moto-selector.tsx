"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Search, Bike, X, Check } from "lucide-react"
import { Input } from "@/components/ui/input"

export type ModeloOption = {
  id: string
  slug: string
  nombre: string
  marca: string
  anio: number | null
  kilometros: number | null
  condicion: string
  chasis: string | null
  motor: string | null
  patente: string | null
  precio: number | null
  moneda: string
  fotos: string[]
  vendida: boolean
}

export function MotoSelector({
  modelos,
  value,
  onChange,
  onPick,
}: {
  modelos: ModeloOption[]
  value: string
  onChange: (id: string) => void
  // Opcional: callback que recibe el modelo completo cuando se selecciona
  onPick?: (modelo: ModeloOption) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const selected = modelos.find((m) => m.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = modelos.filter((m) => !m.vendida)
    if (!q) return base.slice(0, 15)
    return base
      .filter((m) => {
        const hay = [m.nombre, m.marca, m.slug, m.anio?.toString(), m.patente]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 15)
  }, [modelos, query])

  if (selected) {
    return (
      <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selected.fotos[0] ? (
            <Image
              src={selected.fotos[0]}
              alt={selected.nombre}
              width={40}
              height={40}
              className="size-10 rounded object-cover"
            />
          ) : (
            <div className="size-10 rounded bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-300">
              <Bike className="size-5" />
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{selected.nombre}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase">
              {selected.slug}{selected.patente ? ` · ${selected.patente}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange("")
            setQuery("")
          }}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 px-2 py-1 rounded"
        >
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar moto del catálogo (mf001, Honda, patente...)"
          className="pl-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full rounded-md border bg-white dark:bg-neutral-900 shadow-lg max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Sin resultados
            </p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(m.id)
                  onPick?.(m)
                  setQuery("")
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-900 border-b border-gray-50 last:border-0 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {m.fotos[0] ? (
                    <Image
                      src={m.fotos[0]}
                      alt={m.nombre}
                      width={36}
                      height={36}
                      className="size-9 rounded object-cover"
                    />
                  ) : (
                    <div className="size-9 rounded bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-300">
                      <Bike className="size-4" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{m.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase">
                      {m.slug}{m.patente ? ` · ${m.patente}` : ""}
                    </p>
                  </div>
                </div>
                {value === m.id && (
                  <Check className="size-4 text-[#6B4F7A]" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

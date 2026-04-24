"use client"

import { useMemo, useState } from "react"
import { Search, User, Plus, X, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ClienteQuickCreateModal } from "./cliente-quick-create-modal"

export type ClienteOption = {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  telefono: string | null
  email: string | null
}

export function ClienteSelector({
  clientes: initialClientes,
  value,
  onChange,
}: {
  clientes: ClienteOption[]
  value: string
  onChange: (id: string) => void
}) {
  // Mantiene estado local de clientes para poder agregar recién creados sin recargar
  const [clientes, setClientes] = useState<ClienteOption[]>(initialClientes)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const selected = clientes.find((c) => c.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes.slice(0, 15)
    return clientes
      .filter((c) => {
        const hay = [c.nombre, c.apellido, c.dni, c.telefono, c.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 15)
  }, [clientes, query])

  const handleCreated = (c: ClienteOption) => {
    setClientes((prev) => [c, ...prev])
    onChange(c.id)
    setQuery("")
  }

  if (selected) {
    return (
      <>
        <div className="rounded-md border border-gray-200 bg-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center text-[#6B4F7A]">
              <User className="size-4" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {selected.apellido}, {selected.nombre}
              </p>
              <p className="text-xs text-gray-500">
                {selected.dni ? `DNI ${selected.dni}` : "Sin DNI"}
                {selected.telefono && ` · ${selected.telefono}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("")
              setQuery("")
            }}
            className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded"
          >
            Cambiar
          </button>
        </div>
      </>
    )
  }

  return (
    <>
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
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Buscar cliente por nombre, DNI, teléfono..."
            className="pl-9 pr-32"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-28 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setModalOpen(true)}
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-[#6B4F7A] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#8B6F9A]"
          >
            <Plus className="size-3" /> Nuevo
          </button>
        </div>

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Sin resultados</p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-[#6B4F7A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8B6F9A]"
                >
                  <Plus className="size-3" /> Crear cliente {query && `"${query}"`}
                </button>
              </div>
            ) : (
              <>
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(c.id)
                      setQuery("")
                      setOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {c.apellido}, {c.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.dni ? `DNI ${c.dni}` : "Sin DNI"}
                        {c.telefono && ` · ${c.telefono}`}
                      </p>
                    </div>
                    {value === c.id && (
                      <Check className="size-4 text-[#6B4F7A]" />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setModalOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 text-[#6B4F7A] hover:bg-[#6B4F7A]/5 text-sm font-medium border-t"
                >
                  <Plus className="size-4" /> Crear cliente nuevo
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ClienteQuickCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        initialQuery={query}
      />
    </>
  )
}

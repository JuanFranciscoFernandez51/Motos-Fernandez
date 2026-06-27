"use client"

import { useEffect, useRef, useState } from "react"
import { Search, User, Plus, X, Check, Pencil, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ClienteQuickCreateModal } from "./cliente-quick-create-modal"
import { ClienteQuickEditModal } from "./cliente-quick-edit-modal"

export type ClienteOption = {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  telefono: string | null
  email: string | null
}

export function ClienteSelector({
  clientes: initialClientes = [],
  value,
  onChange,
}: {
  clientes?: ClienteOption[]
  value: string
  onChange: (id: string) => void
}) {
  // Estado local de clientes: arranca con la semilla (si vino) y se va
  // llenando con los resultados de la búsqueda server-side a medida que se tipea.
  const [clientes, setClientes] = useState<ClienteOption[]>(initialClientes)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = clientes.find((c) => c.id === value) ?? null

  const handleUpdated = (c: ClienteOption) => {
    // Reemplazar in-place el cliente actualizado para que el selector
    // muestre los datos nuevos sin recargar.
    setClientes((prev) => prev.map((x) => (x.id === c.id ? c : x)))
  }

  // Si hay un cliente seleccionado (ej. al editar una OC) pero no está en la
  // lista local, lo traemos por id para poder mostrar su ficha.
  useEffect(() => {
    if (!value || clientes.some((c) => c.id === value)) return
    let cancel = false
    fetch(`/api/admin/clientes/search?id=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.clientes?.[0]
        if (!cancel && c) setClientes((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]))
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [value, clientes])

  // Búsqueda server-side con debounce (o "más recientes" al abrir sin texto).
  // Reemplaza la precarga de los ~2700 clientes en cada formulario.
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/admin/clientes/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setClientes(d.clientes || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, open])

  const filtered = clientes

  const handleCreated = (c: ClienteOption) => {
    setClientes((prev) => [c, ...prev])
    onChange(c.id)
    setQuery("")
  }

  if (selected) {
    return (
      <>
        <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED]">
              <User className="size-4" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {selected.apellido}, {selected.nombre}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selected.dni ? `DNI ${selected.dni}` : "Sin DNI"}
                {selected.telefono && ` · ${selected.telefono}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-[#7C3AED] hover:bg-[#7C3AED]/10 px-2 py-1 rounded"
              title="Editar datos del cliente"
            >
              <Pencil className="size-3" />
              Editar
            </button>
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
        </div>
        <ClienteQuickEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onUpdated={handleUpdated}
          clienteId={selected.id}
        />
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
              className="absolute right-28 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setModalOpen(true)}
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-[#7C3AED] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0]"
          >
            <Plus className="size-3" /> Nuevo
          </button>
        </div>

        {open && (
          <div className="absolute z-40 mt-1 w-full rounded-md border bg-white dark:bg-neutral-900 shadow-lg max-h-80 overflow-y-auto">
            {loading && filtered.length === 0 ? (
              <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="size-4 animate-spin" /> Buscando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Sin resultados</p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-[#7C3AED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9D5CF0]"
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
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-900 border-b border-gray-50 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {c.apellido}, {c.nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.dni ? `DNI ${c.dni}` : "Sin DNI"}
                        {c.telefono && ` · ${c.telefono}`}
                      </p>
                    </div>
                    {value === c.id && (
                      <Check className="size-4 text-[#7C3AED]" />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setModalOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-neutral-900 text-[#7C3AED] hover:bg-[#7C3AED]/5 text-sm font-medium border-t"
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

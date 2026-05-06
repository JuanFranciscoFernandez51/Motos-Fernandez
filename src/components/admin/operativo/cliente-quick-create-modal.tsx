"use client"

import { useState } from "react"
import { X, Loader2, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClienteOption } from "./cliente-selector"

export function ClienteQuickCreateModal({
  open,
  onClose,
  onCreated,
  initialQuery = "",
}: {
  open: boolean
  onClose: () => void
  onCreated: (cliente: ClienteOption) => void
  initialQuery?: string
}) {
  // Intentar extraer nombre/apellido de la query (ej: "Juan Perez" → apellido="Perez", nombre="Juan")
  const splitQuery = (q: string) => {
    const parts = q.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return { nombre: "", apellido: "" }
    if (parts.length === 1) return { nombre: parts[0], apellido: "" }
    return { nombre: parts[0], apellido: parts.slice(1).join(" ") }
  }
  const parsed = splitQuery(initialQuery)

  const [nombre, setNombre] = useState(parsed.nombre)
  const [apellido, setApellido] = useState(parsed.apellido)
  const [dni, setDni] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [direccion, setDireccion] = useState("")
  const [ciudad, setCiudad] = useState("Bahía Blanca")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!nombre.trim() || !apellido.trim()) {
      setError("Nombre y apellido son obligatorios")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          dni,
          telefono,
          email,
          direccion,
          ciudad,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al crear cliente")
        return
      }
      onCreated(data.cliente)
      // Reset y cerrar
      setNombre("")
      setApellido("")
      setDni("")
      setTelefono("")
      setEmail("")
      setDireccion("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-10 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-[#6B4F7A]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Nuevo cliente
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
            disabled={loading}
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cargá los datos básicos. Podés completar el resto después desde{" "}
              <strong>Clientes</strong>.
            </p>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quick-apellido">Apellido *</Label>
                <Input
                  id="quick-apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="quick-nombre">Nombre *</Label>
                <Input
                  id="quick-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="quick-dni">DNI</Label>
                <Input
                  id="quick-dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  placeholder="12345678"
                />
              </div>
              <div>
                <Label htmlFor="quick-telefono">Teléfono</Label>
                <Input
                  id="quick-telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="2914567890"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="quick-email">Email</Label>
                <Input
                  id="quick-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="quick-direccion">Dirección</Label>
                <Input
                  id="quick-direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. Colón 1500"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="quick-ciudad">Ciudad</Label>
                <Input
                  id="quick-ciudad"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-neutral-800 px-5 py-3 bg-gray-50 dark:bg-neutral-900 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#8B6F9A] disabled:opacity-50"
            >
              {loading && <Loader2 className="size-3 animate-spin" />}
              Crear y usar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

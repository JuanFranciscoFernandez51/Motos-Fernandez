"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ModeloOption } from "./moto-selector"

/**
 * Modal para crear una moto rápida desde el form de OC, cuando aparece
 * un cliente con una moto que no está cargada en el catálogo todavía.
 *
 * Solo pide los campos esenciales — la moto se crea inactiva, el admin
 * puede completar foto y demás después desde /admin/modelos.
 */
export function NuevaMotoQuickModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (m: ModeloOption) => void
}) {
  const [marca, setMarca] = useState("")
  const [nombre, setNombre] = useState("")
  const [condicion, setCondicion] = useState<"0KM" | "USADA">("0KM")
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [kilometros, setKilometros] = useState("")
  const [precio, setPrecio] = useState("")
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS")
  const [chasis, setChasis] = useState("")
  const [motor, setMotor] = useState("")
  const [patente, setPatente] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      // Reset cuando se abre
      setMarca("")
      setNombre("")
      setCondicion("0KM")
      setAnio(String(new Date().getFullYear()))
      setKilometros("")
      setPrecio("")
      setMoneda("ARS")
      setChasis("")
      setMotor("")
      setPatente("")
      setError(null)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!marca.trim() || !nombre.trim()) {
      setError("Marca y modelo son obligatorios")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/modelos/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca: marca.trim(),
          nombre: nombre.trim(),
          condicion,
          anio: anio ? parseInt(anio) : null,
          kilometros: kilometros ? parseInt(kilometros) : null,
          precio: precio ? parseInt(precio) : null,
          moneda,
          chasis: chasis.trim() || null,
          motor: motor.trim() || null,
          patente: patente.trim().toUpperCase() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok || !data.modelo) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      onCreated(data.modelo as ModeloOption)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-12"
      onClick={() => !loading && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg bg-white dark:bg-neutral-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus className="size-5 text-[#7C3AED]" />
            Cargar moto rápida al catálogo
          </h3>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
            disabled={loading}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Se va a cargar como inactiva. Completá foto + precio definitivo
            después desde <code className="font-mono">/admin/modelos</code>.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qm-marca">Marca *</Label>
              <Input
                id="qm-marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Honda"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-nombre">Modelo *</Label>
              <Input
                id="qm-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="CRF 250 Rally"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-condicion">Condición</Label>
              <select
                id="qm-condicion"
                value={condicion}
                onChange={(e) => setCondicion(e.target.value as "0KM" | "USADA")}
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
              >
                <option value="0KM">0KM</option>
                <option value="USADA">Usada</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-anio">Año</Label>
              <Input
                id="qm-anio"
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                placeholder="2026"
              />
            </div>
            {condicion === "USADA" && (
              <div className="space-y-1.5">
                <Label htmlFor="qm-km">Km</Label>
                <Input
                  id="qm-km"
                  type="number"
                  value={kilometros}
                  onChange={(e) => setKilometros(e.target.value)}
                  placeholder="12000"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="qm-precio">Precio</Label>
              <Input
                id="qm-precio"
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="1500000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-moneda">Moneda</Label>
              <select
                id="qm-moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")}
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
              >
                <option value="ARS">$ ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-chasis">N° chasis (opcional)</Label>
              <Input
                id="qm-chasis"
                value={chasis}
                onChange={(e) => setChasis(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-motor">N° motor (opcional)</Label>
              <Input
                id="qm-motor"
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="qm-patente">Patente (opcional)</Label>
              <Input
                id="qm-patente"
                value={patente}
                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                placeholder="AB123CD"
              />
            </div>
          </div>

          {error && (
            <p className="rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-neutral-800 px-5 py-3">
          <button
            type="button"
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#7C3AED] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#9D5CF0] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Crear y seleccionar
          </button>
        </div>
      </form>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, X, Save, AlertCircle } from "lucide-react"
import { ClienteSelector, type ClienteOption } from "@/components/admin/operativo/cliente-selector"
import type { StockMotoUI } from "./stock-motos-client"

/**
 * Modal de edición rápida para Stock motos. Solo edita los campos
 * administrativos puros (marca, modelo, año, km, chasis, motor, patente,
 * precio, moneda, cliente dueño). NO toca fotos, descripción, SEO ni
 * el resto del catálogo público — eso se sigue editando desde
 * /admin/modelos/[id] (botón "Ficha completa").
 *
 * Se abre con doble click en la fila o con el botón "Editar" en la
 * columna de acciones. Al guardar, refresca la lista server-side
 * (router.refresh del padre).
 */
export function EditStockModal({
  open,
  onClose,
  onSaved,
  moto,
  clientes,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  moto: StockMotoUI | null
  clientes: ClienteOption[]
}) {
  const [marca, setMarca] = useState("")
  const [nombre, setNombre] = useState("")
  const [anio, setAnio] = useState("")
  const [kilometros, setKilometros] = useState("")
  const [chasis, setChasis] = useState("")
  const [motor, setMotor] = useState("")
  const [patente, setPatente] = useState("")
  const [precio, setPrecio] = useState("")
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS")
  const [clienteEntregaId, setClienteEntregaId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Inicializar campos cuando abre con una moto nueva
  useEffect(() => {
    if (!open || !moto) return
    setMarca(moto.marca || "")
    setNombre(moto.nombre || "")
    setAnio(moto.anio != null ? String(moto.anio) : "")
    setKilometros(moto.kilometros != null ? String(moto.kilometros) : "")
    setChasis(moto.chasis || "")
    setMotor(moto.motor || "")
    setPatente(moto.patente || "")
    setPrecio(moto.precio != null ? String(moto.precio) : "")
    setMoneda((moto.moneda as "ARS" | "USD") || "ARS")
    // El clienteEntregaId no está en StockMotoUI directo — lo deducimos
    // de la presencia de clienteEntrega + lookup en lista. Lo carga el
    // padre antes con la info correcta.
    setClienteEntregaId(moto.clienteEntregaId || "")
    setError("")
  }, [open, moto])

  if (!open || !mounted || !moto) return null

  const handleGuardar = async () => {
    setError("")
    if (!marca.trim()) return setError("La marca es obligatoria")
    if (!nombre.trim()) return setError("El modelo es obligatorio")
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/stock-motos/${moto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca: marca.trim(),
          nombre: nombre.trim(),
          anio: anio || null,
          kilometros: kilometros || null,
          chasis: chasis.trim() || null,
          motor: motor.trim() || null,
          patente: patente.trim() || null,
          precio: precio || null,
          moneda,
          clienteEntregaId: clienteEntregaId || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-white dark:bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Editar moto · {moto.codigo}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Datos administrativos. Para fotos / descripción / SEO usá
              "Ficha completa".
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Marca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Modelo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Año
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                placeholder="2024"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Km
              </label>
              <input
                type="number"
                value={kilometros}
                onChange={(e) => setKilometros(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                N° chasis
              </label>
              <input
                type="text"
                value={chasis}
                onChange={(e) => setChasis(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                N° motor
              </label>
              <input
                type="text"
                value={motor}
                onChange={(e) => setMotor(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Patente
              </label>
              <input
                type="text"
                value={patente}
                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                placeholder="AB123CD"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Precio venta
              </label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="1500000"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="overflow-visible">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Dueño anterior / cliente que la entregó
              <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
            </label>
            <ClienteSelector
              clientes={clientes}
              value={clienteEntregaId}
              onChange={(id) => setClienteEntregaId(id)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50 dark:bg-neutral-900/60 rounded-b-xl">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

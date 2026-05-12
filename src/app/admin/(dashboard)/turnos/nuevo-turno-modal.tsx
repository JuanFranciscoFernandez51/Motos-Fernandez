"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Plus } from "lucide-react"
import { SERVICIOS_TALLER } from "@/lib/constants"

type Turno = {
  id: string
  nombre: string
  apellido: string | null
  dni: string | null
  email: string | null
  telefono: string
  modeloMoto: string | null
  modelo: { nombre: string } | null
  tipoServicio: string
  fechaPreferida: string | null
  fechaConfirmada: string | null
  estado: string
  clienteId: string | null
  ordenTrabajoId: string | null
  createdAt: string
}

/**
 * Modal para crear un turno desde el admin. Pide los mismos datos
 * obligatorios que el formulario público (nombre, DNI, celular, email,
 * moto y tipo de servicio). Opcionalmente fecha preferida + comentarios.
 *
 * Usa createPortal para evitar mounted forms anidados en la página padre.
 */
export function NuevoTurnoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (turno: Turno) => void
}) {
  const [nombre, setNombre] = useState("")
  const [dni, setDni] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [modeloMoto, setModeloMoto] = useState("")
  const [tipoServicio, setTipoServicio] = useState<string>(SERVICIOS_TALLER[0])
  const [fechaPreferida, setFechaPreferida] = useState("")
  const [comentarios, setComentarios] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Portal mount guard (evita mismatch SSR)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!mounted) return null

  const handleCrear = async () => {
    setError("")

    // Validacion en cliente (los mismos campos que el form publico)
    if (!nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    if (!dni.trim()) {
      setError("El DNI es obligatorio")
      return
    }
    if (!telefono.trim()) {
      setError("El celular es obligatorio")
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresá un email válido")
      return
    }
    if (!modeloMoto.trim()) {
      setError("La moto es obligatoria")
      return
    }
    if (!tipoServicio) {
      setError("Elegí un tipo de servicio")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          dni: dni.trim(),
          telefono: telefono.trim(),
          email: email.trim().toLowerCase(),
          modeloMoto: modeloMoto.trim(),
          tipoServicio,
          fechaPreferida: fechaPreferida || null,
          comentarios: comentarios.trim() || null,
          estado: "PENDIENTE",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      // Normalizamos: la API devuelve el turno sin `modelo` (relación) — el
      // estado en el cliente igual usa `modeloMoto` libre si modelo es null.
      const turno: Turno = {
        ...data,
        apellido: data.apellido ?? null,
        dni: data.dni ?? null,
        email: data.email ?? null,
        modelo: data.modelo ?? null,
        clienteId: data.clienteId ?? null,
        ordenTrabajoId: data.ordenTrabajoId ?? null,
      }
      onCreated(turno)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el turno")
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F0EBF4] flex items-center justify-center">
              <Plus className="h-4 w-4 text-[#6B4F7A]" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Nuevo turno
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                DNI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="20.123.456"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Celular <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="291..."
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Moto (marca y modelo) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modeloMoto}
              onChange={(e) => setModeloMoto(e.target.value)}
              placeholder="Vespa Primavera 150"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de servicio <span className="text-red-500">*</span>
            </label>
            <select
              value={tipoServicio}
              onChange={(e) => setTipoServicio(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
            >
              {SERVICIOS_TALLER.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha preferida <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaPreferida}
              onChange={(e) => setFechaPreferida(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comentarios <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={2}
              placeholder="Detalles, ruidos, problemas reportados..."
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#6B4F7A] focus:border-[#6B4F7A] outline-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50 dark:bg-neutral-900/60 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCrear}
            disabled={loading}
            className="px-3 py-2 text-sm rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear turno
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

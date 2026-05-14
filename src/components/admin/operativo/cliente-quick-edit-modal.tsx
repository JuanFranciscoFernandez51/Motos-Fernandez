"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, UserPen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClienteOption } from "./cliente-selector"

/**
 * Modal para EDITAR el cliente que está actualmente seleccionado en
 * un selector (OC, Mandato, etc). Carga los datos completos desde la API
 * cuando se abre, guarda con PATCH y devuelve la shape ClienteOption
 * actualizada al caller para que refresque su state in-place.
 *
 * Igual que el quick-create, vive en portal a document.body para evitar
 * problemas con forms anidados.
 */
export function ClienteQuickEditModal({
  open,
  onClose,
  onUpdated,
  clienteId,
}: {
  open: boolean
  onClose: () => void
  onUpdated: (cliente: ClienteOption) => void
  clienteId: string | null
}) {
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [dni, setDni] = useState("")
  const [cuit, setCuit] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [direccion, setDireccion] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [ocupacion, setOcupacion] = useState("")
  const [notasInternas, setNotasInternas] = useState("")
  const [loadingFetch, setLoadingFetch] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  // Si el cliente es el "placeholder" compartido por varios mandatos,
  // bloqueamos la edicion para evitar el bug donde un admin queria
  // "completar el cliente del MT-07" y termino renombrando el placeholder,
  // cambiando los datos de TODOS los otros mandatos que apuntan a el.
  const [esPlaceholder, setEsPlaceholder] = useState(false)
  const [mandatosCount, setMandatosCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cargar datos del cliente al abrir
  useEffect(() => {
    if (!open || !clienteId) return
    setError("")
    setLoadingFetch(true)
    fetch(`/api/admin/clientes/${clienteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.cliente) {
          const c = data.cliente
          setNombre(c.nombre || "")
          setApellido(c.apellido || "")
          setDni(c.dni || "")
          setCuit(c.cuit || "")
          setTelefono(c.telefono || "")
          setEmail(c.email || "")
          setDireccion(c.direccion || "")
          setCiudad(c.ciudad || "")
          setOcupacion(c.ocupacion || "")
          setNotasInternas(c.notasInternas || "")
          // Detectar si es el placeholder por convencion
          const placeholder =
            (c.apellido || "").toUpperCase() === "POR COMPLETAR" &&
            (c.nombre || "").toLowerCase() === "cliente"
          setEsPlaceholder(placeholder)
          setMandatosCount(typeof data.mandatosCount === "number" ? data.mandatosCount : 0)
        } else {
          setError("No se pudo cargar el cliente")
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error de red")
      })
      .finally(() => setLoadingFetch(false))
  }, [open, clienteId])

  if (!open || !mounted || !clienteId) return null

  const handleGuardar = async () => {
    setError("")
    if (!nombre.trim() || !apellido.trim()) {
      setError("Nombre y apellido son obligatorios")
      return
    }
    setLoadingSave(true)
    try {
      const res = await fetch(`/api/admin/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          apellido,
          dni,
          cuit,
          telefono,
          email,
          direccion,
          ciudad,
          ocupacion,
          notasInternas,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error al actualizar (HTTP ${res.status})`)
        return
      }
      if (!data.cliente) {
        setError("Respuesta del servidor sin cliente")
        return
      }
      onUpdated(data.cliente)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión")
    } finally {
      setLoadingSave(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void handleGuardar()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-4 pt-10 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loadingSave) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 px-5 py-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPen className="size-5 text-[#6B4F7A]" />
            Editar cliente
          </h3>
          <button
            type="button"
            onClick={() => !loadingSave && onClose()}
            disabled={loadingSave}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {loadingFetch ? (
          <div className="px-5 py-10 text-center">
            <Loader2 className="size-6 animate-spin text-gray-400 mx-auto" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Cargando datos del cliente...
            </p>
          </div>
        ) : esPlaceholder ? (
          // Cliente placeholder: bloquear edicion. Editar este cliente
          // cambiaria los datos de TODOS los mandatos que lo referencian.
          <div className="space-y-3 px-5 py-6">
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-4">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                ⚠ Este es el cliente placeholder
              </h4>
              <p className="text-sm text-amber-900 dark:text-amber-200/90 leading-relaxed">
                Este cliente es genérico y está compartido por{" "}
                <strong>{mandatosCount || "varios"} mandatos</strong> que
                todavía no tienen el dueño real cargado.
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-200/90 mt-2 leading-relaxed">
                Si lo editás acá, vas a cambiar los datos en{" "}
                <strong>TODOS</strong> los mandatos a la vez (no es lo que
                querés).
              </p>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mt-3 leading-relaxed">
                Lo que tenés que hacer:
              </p>
              <ol className="list-decimal ml-5 text-sm text-amber-900 dark:text-amber-200/90 mt-1 space-y-0.5">
                <li>Cerrá este modal</li>
                <li>
                  En el selector de cliente, escribí el nombre real del dueño:
                  si ya existe lo elegís, si no usá{" "}
                  <strong>"+ Nuevo cliente"</strong> para crearlo
                </li>
                <li>Guardá el mandato</li>
              </ol>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white px-4 py-2 text-sm font-medium"
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-5 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Completá o corregí los datos que faltan. Los cambios se guardan
              en la ficha del cliente y se reflejan en todas las OCs, mandatos
              y OTs que lo referencian.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cl-nombre">Nombre *</Label>
                <Input
                  id="cl-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-apellido">Apellido *</Label>
                <Input
                  id="cl-apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-dni">DNI</Label>
                <Input
                  id="cl-dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-cuit">CUIT/CUIL</Label>
                <Input
                  id="cl-cuit"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-telefono">Teléfono</Label>
                <Input
                  id="cl-telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-email">Email</Label>
                <Input
                  id="cl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cl-direccion">Domicilio</Label>
                <Input
                  id="cl-direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-ciudad">Ciudad</Label>
                <Input
                  id="cl-ciudad"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cl-ocupacion">Ocupación</Label>
                <Input
                  id="cl-ocupacion"
                  value={ocupacion}
                  onChange={(e) => setOcupacion(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cl-notas">Notas internas</Label>
                <textarea
                  id="cl-notas"
                  value={notasInternas}
                  onChange={(e) => setNotasInternas(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-neutral-800 px-5 py-3">
          <button
            type="button"
            onClick={() => !loadingSave && onClose()}
            disabled={loadingSave}
            className="rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loadingFetch || loadingSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#8B6F9A] disabled:opacity-50"
          >
            {loadingSave ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPen className="size-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}

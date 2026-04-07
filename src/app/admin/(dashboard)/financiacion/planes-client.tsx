"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatPrice } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, CreditCard, AlertTriangle } from "lucide-react"

type Plan = {
  id: string
  nombre: string
  tipo: string
  cuotas: number
  coeficiente: number
  anticipoMinimo: number
  descripcion: string | null | undefined
  activo: boolean
  orden: number
}

type FormData = {
  nombre: string
  tipo: string
  cuotas: string
  coeficiente: string
  anticipoMinimo: string
  descripcion: string
  orden: string
  activo: boolean
}

const EMPTY_FORM: FormData = {
  nombre: "",
  tipo: "PROPIA",
  cuotas: "",
  coeficiente: "",
  anticipoMinimo: "0",
  descripcion: "",
  orden: "0",
  activo: true,
}

export function PlanesClient({
  planes,
  defaultsIfEmpty,
}: {
  planes: Plan[]
  defaultsIfEmpty: Plan[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayPlanes = planes.length > 0 ? planes : defaultsIfEmpty

  function startNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id)
    setForm({
      nombre: plan.nombre,
      tipo: plan.tipo ?? "PROPIA",
      cuotas: String(plan.cuotas),
      coeficiente: String(plan.coeficiente),
      anticipoMinimo: String(plan.anticipoMinimo ?? 0),
      descripcion: plan.descripcion ?? "",
      orden: String(plan.orden),
      activo: plan.activo,
    })
    setError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        cuotas: Number(form.cuotas),
        coeficiente: Number(form.coeficiente),
        anticipoMinimo: Number(form.anticipoMinimo) || 0,
        descripcion: form.descripcion || null,
        orden: Number(form.orden) || 0,
        activo: form.activo,
      }

      const url = editingId
        ? `/api/admin/financiacion?id=${editingId}`
        : "/api/admin/financiacion"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }

      cancelForm()
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al guardar el plan")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el plan "${nombre}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/financiacion?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al eliminar")
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Error al eliminar el plan")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActivo(plan: Plan) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/financiacion?id=${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: plan.nombre,
          cuotas: plan.cuotas,
          coeficiente: plan.coeficiente,
          descripcion: plan.descripcion,
          orden: plan.orden,
          activo: !plan.activo,
        }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      router.refresh()
    } catch {
      alert("Error al actualizar el plan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes de financiacion</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura los coeficientes del simulador publico
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={startNew}
            className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar plan
          </Button>
        )}
      </div>

      {/* Banner si no hay planes reales */}
      {planes.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            No hay planes cargados. El simulador usa valores de referencia predeterminados. Carga los planes reales abajo.
          </p>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? "Editar plan" : "Nuevo plan"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                >
                  <option value="PROPIA">Financiación propia</option>
                  <option value="TARJETA">Con tarjeta</option>
                </select>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12 cuotas"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                />
              </div>

              {/* Anticipo mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anticipo mínimo (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={form.anticipoMinimo}
                  onChange={(e) => setForm({ ...form, anticipoMinimo: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                />
                <p className="text-xs text-gray-500 mt-1">0 = sin anticipo mínimo</p>
              </div>

              {/* Cuotas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuotas <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="12"
                  value={form.cuotas}
                  onChange={(e) => setForm({ ...form, cuotas: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                />
              </div>

              {/* Coeficiente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coeficiente <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.001"
                  min={0}
                  placeholder="0.110"
                  value={form.coeficiente}
                  onChange={(e) => setForm({ ...form, coeficiente: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cuota mensual = monto financiado × coeficiente
                </p>
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: incluye seguro"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                />
              </div>

              {/* Orden */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#6B4F7A] focus:outline-none focus:ring-1 focus:ring-[#6B4F7A]"
                />
              </div>

              {/* Activo */}
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#6B4F7A] focus:ring-[#6B4F7A]"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Activo
                </label>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            )}

            {/* Preview cuota */}
            {form.coeficiente && Number(form.coeficiente) > 0 && (
              <div className="rounded-md bg-[#6B4F7A]/5 border border-[#6B4F7A]/20 px-4 py-2 text-sm text-[#6B4F7A]">
                Cuota por $1.000.000: <span className="font-bold">{formatPrice(1_000_000 * Number(form.coeficiente))}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
              >
                {loading ? "Guardando..." : editingId ? "Guardar cambios" : "Crear plan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelForm}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-20">Cuotas</TableHead>
              <TableHead className="w-20">Anticipo mín.</TableHead>
              <TableHead className="w-28">Coeficiente</TableHead>
              <TableHead className="w-36">Cuota por $1M</TableHead>
              <TableHead className="w-24">Activo</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayPlanes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay planes cargados
                </TableCell>
              </TableRow>
            ) : (
              displayPlanes.map((plan) => (
                <TableRow key={plan.id || plan.nombre} className={!plan.id ? "opacity-60" : ""}>
                  <TableCell className="text-sm text-gray-500">{plan.orden}</TableCell>
                  <TableCell className="font-medium">{plan.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={plan.tipo === "TARJETA" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                      {plan.tipo === "TARJETA" ? "Tarjeta" : "Propia"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{plan.cuotas}</TableCell>
                  <TableCell className="text-sm">{(plan.anticipoMinimo ?? 0) > 0 ? `${plan.anticipoMinimo}%` : "-"}</TableCell>
                  <TableCell className="text-sm font-mono">{plan.coeficiente}</TableCell>
                  <TableCell className="text-sm font-semibold text-[#6B4F7A]">
                    {formatPrice(1_000_000 * plan.coeficiente)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {plan.descripcion || "-"}
                  </TableCell>
                  <TableCell>
                    {plan.id ? (
                      <button onClick={() => handleToggleActivo(plan)} disabled={loading}>
                        <Badge
                          variant="secondary"
                          className={
                            plan.activo
                              ? "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200"
                          }
                        >
                          {plan.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </button>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(plan)}
                          disabled={loading}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id, plan.nombre)}
                          disabled={loading}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Solo lectura</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

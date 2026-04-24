"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Tag } from "lucide-react"

type Promocion = {
  id: string
  titulo: string
  descripcion: string | null
  imagen: string | null
  link: string | null
  fechaInicio: Date
  fechaFin: Date
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

type FormData = {
  titulo: string
  descripcion: string
  imagen: string
  link: string
  fechaInicio: string
  fechaFin: string
  activo: boolean
}

const emptyForm: FormData = {
  titulo: "",
  descripcion: "",
  imagen: "",
  link: "",
  fechaInicio: "",
  fechaFin: "",
  activo: true,
}

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().split("T")[0]
}

function getEstado(p: Promocion): { label: string; className: string } {
  const now = new Date()
  if (!p.activo) {
    return { label: "Inactiva", className: "bg-red-100 text-red-700" }
  }
  if (new Date(p.fechaFin) < now) {
    return { label: "Vencida", className: "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400" }
  }
  return { label: "Activa", className: "bg-green-100 text-green-800" }
}

export function PromocionesClient({ promociones }: { promociones: Promocion[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNueva() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  function openEditar(p: Promocion) {
    setEditingId(p.id)
    setForm({
      titulo: p.titulo,
      descripcion: p.descripcion ?? "",
      imagen: p.imagen ?? "",
      link: p.link ?? "",
      fechaInicio: toDateInputValue(p.fechaInicio),
      fechaFin: toDateInputValue(p.fechaFin),
      activo: p.activo,
    })
    setError(null)
    setShowForm(true)
  }

  function cancelar() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        imagen: form.imagen || null,
        link: form.link || null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        activo: form.activo,
      }

      const url = editingId
        ? `/api/admin/promociones?id=${editingId}`
        : "/api/admin/promociones"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al guardar")
      }

      cancelar()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar la promoción "${titulo}"?`)) return

    try {
      const res = await fetch(`/api/admin/promociones?id=${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al eliminar")
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Promociones</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {promociones.length} promoción(es)
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={openNueva}
            className="bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva promoción
          </Button>
        )}
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="rounded-lg border bg-white dark:bg-neutral-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingId ? "Editar promoción" : "Nueva promoción"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Título */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="titulo">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Oferta de verano"
                  required
                />
              </div>

              {/* Descripción */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción opcional de la promoción"
                  rows={3}
                />
              </div>

              {/* Imagen URL */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="imagen">URL de imagen</Label>
                <Input
                  id="imagen"
                  type="text"
                  value={form.imagen}
                  onChange={(e) => setForm({ ...form, imagen: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                />
              </div>

              {/* Link */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="link">Link (URL opcional)</Label>
                <Input
                  id="link"
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              {/* Fecha inicio */}
              <div className="space-y-1">
                <Label htmlFor="fechaInicio">
                  Fecha inicio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                  required
                />
              </div>

              {/* Fecha fin */}
              <div className="space-y-1">
                <Label htmlFor="fechaFin">
                  Fecha fin <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                  required
                />
              </div>

              {/* Activo */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="activo"
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 dark:border-neutral-700 text-[#6B4F7A] accent-[#6B4F7A]"
                />
                <Label htmlFor="activo" className="cursor-pointer">
                  Activa
                </Label>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white"
              >
                {loading ? "Guardando..." : editingId ? "Guardar cambios" : "Crear promoción"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelar}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-lg border bg-white dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagen</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promociones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay promociones cargadas
                </TableCell>
              </TableRow>
            ) : (
              promociones.map((p) => {
                const estado = getEstado(p)
                return (
                  <TableRow key={p.id}>
                    {/* Thumbnail */}
                    <TableCell>
                      {p.imagen ? (
                        <div className="relative w-[60px] h-[40px] rounded overflow-hidden border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
                          <Image
                            src={p.imagen}
                            alt={p.titulo}
                            fill
                            className="object-cover"
                            sizes="60px"
                          />
                        </div>
                      ) : (
                        <div className="w-[60px] h-[40px] rounded border border-dashed border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
                          <Tag className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                    </TableCell>

                    {/* Título + descripción */}
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{p.titulo}</div>
                      {p.descripcion && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {p.descripcion}
                        </div>
                      )}
                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#6B4F7A] hover:underline mt-0.5 block truncate max-w-[200px]"
                        >
                          {p.link}
                        </a>
                      )}
                    </TableCell>

                    {/* Período */}
                    <TableCell className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <span>
                        {new Date(p.fechaInicio).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span>
                        {new Date(p.fechaFin).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={estado.className}
                      >
                        {estado.label}
                      </Badge>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditar(p)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEliminar(p.id, p.titulo)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

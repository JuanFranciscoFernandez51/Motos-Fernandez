"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Check, X, Loader2 } from "lucide-react"
import { formatMoney } from "@/lib/admin-helpers"

type Tipo = {
  id: string
  nombre: string
  descripcion: string | null
  precioBase: number | null
  duracionMin: number | null
  activo: boolean
  ordenesCount: number
}

export function TiposServicioList({
  tipos,
  crearTipo,
  actualizarTipo,
  eliminarTipo,
}: {
  tipos: Tipo[]
  crearTipo: (data: FormData) => Promise<{ error?: string }>
  actualizarTipo: (id: string, data: FormData) => Promise<{ error?: string }>
  eliminarTipo: (id: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const handleCrear = (formData: FormData) => {
    setError("")
    startTransition(async () => {
      const result = await crearTipo(formData)
      if (result?.error) setError(result.error)
      else setAdding(false)
    })
  }

  const handleActualizar = (id: string, formData: FormData) => {
    setError("")
    startTransition(async () => {
      const result = await actualizarTipo(id, formData)
      if (result?.error) setError(result.error)
      else setEditingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {!adding && (
        <Button onClick={() => setAdding(true)} className="bg-[#6B4F7A] hover:bg-[#8B6F9A]">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo tipo de servicio
        </Button>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {adding && (
        <form action={handleCrear} className="rounded-lg border bg-white dark:bg-neutral-900 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" required autoFocus placeholder="Ej: Service 1000km" />
            </div>
            <div>
              <Label htmlFor="precioBase">Precio base</Label>
              <Input id="precioBase" name="precioBase" type="number" placeholder="50000" />
            </div>
            <div>
              <Label htmlFor="duracionMin">Duración (min)</Label>
              <Input id="duracionMin" name="duracionMin" type="number" placeholder="90" />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" name="descripcion" rows={2} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]" disabled={isPending}>
              {isPending && <Loader2 className="size-3 animate-spin mr-1" />}
              Guardar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-lg border bg-white dark:bg-neutral-900 overflow-hidden">
        {tipos.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            Todavía no cargaste tipos de servicio. Cargá los que ofrezcas (cambio de aceite,
            service grande, reparación, etc.)
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {tipos.map((t) =>
              editingId === t.id ? (
                <form
                  key={t.id}
                  action={(fd) => handleActualizar(t.id, fd)}
                  className="p-4 space-y-3 bg-yellow-50/40"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Label>Nombre *</Label>
                      <Input name="nombre" defaultValue={t.nombre} required />
                    </div>
                    <div>
                      <Label>Precio base</Label>
                      <Input name="precioBase" type="number" defaultValue={t.precioBase ?? ""} />
                    </div>
                    <div>
                      <Label>Duración (min)</Label>
                      <Input name="duracionMin" type="number" defaultValue={t.duracionMin ?? ""} />
                    </div>
                    <div className="md:col-span-3">
                      <Label>Descripción</Label>
                      <Textarea name="descripcion" defaultValue={t.descripcion ?? ""} rows={2} />
                    </div>
                    <div>
                      <Label>Activo</Label>
                      <select name="activo" defaultValue={String(t.activo)} className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm">
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]" disabled={isPending}>
                      <Check className="size-3 mr-1" /> Guardar
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                      <X className="size-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-900">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t.nombre}</p>
                      {!t.activo && <Badge variant="secondary" className="bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">Inactivo</Badge>}
                      {t.ordenesCount > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {t.ordenesCount} OT
                        </span>
                      )}
                    </div>
                    {t.descripcion && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.descripcion}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t.precioBase != null && <span>💰 {formatMoney(t.precioBase)}</span>}
                      {t.duracionMin != null && <span>⏱ {t.duracionMin} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(t.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {t.ordenesCount === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Eliminar el tipo "${t.nombre}"?`)) {
                            startTransition(() => eliminarTipo(t.id))
                          }
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

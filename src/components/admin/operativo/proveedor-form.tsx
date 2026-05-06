"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, Plus, Trash2, UserPlus } from "lucide-react"

export type Contacto = {
  id: string
  nombre: string
  rol: string
  telefono: string
  email: string
}

export type ProveedorData = {
  id?: string
  nombre: string
  cuit: string
  rubro: string
  sitio: string
  email: string
  direccion: string
  ciudad: string
  notas: string
  activo: boolean
  contactos: Contacto[]
}

const EMPTY: ProveedorData = {
  nombre: "",
  cuit: "",
  rubro: "",
  sitio: "",
  email: "",
  direccion: "",
  ciudad: "",
  notas: "",
  activo: true,
  contactos: [],
}

const ROLES_SUGERIDOS = [
  "Comercial",
  "Administración",
  "Vendedor",
  "Atención al cliente",
  "Posventa",
  "Garantía",
  "Logística",
  "Repuestos",
  "Otro",
]

function newContacto(): Contacto {
  return {
    id: `c-${Math.random().toString(36).slice(2, 9)}`,
    nombre: "",
    rol: "",
    telefono: "",
    email: "",
  }
}

export function ProveedorForm({
  initialData,
  saveAction,
}: {
  initialData?: Partial<ProveedorData> & { id?: string }
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ProveedorData>({
    ...EMPTY,
    ...initialData,
    contactos: initialData?.contactos ?? [],
  })
  const [error, setError] = useState("")

  const set = <K extends keyof ProveedorData>(
    key: K,
    value: ProveedorData[K]
  ) => setData((prev) => ({ ...prev, [key]: value }))

  const addContacto = () =>
    setData((p) => ({ ...p, contactos: [...p.contactos, newContacto()] }))

  const removeContacto = (id: string) =>
    setData((p) => ({
      ...p,
      contactos: p.contactos.filter((c) => c.id !== id),
    }))

  const updateContacto = (id: string, field: keyof Contacto, value: string) =>
    setData((p) => ({
      ...p,
      contactos: p.contactos.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    // Campos simples
    formData.append("nombre", data.nombre)
    formData.append("cuit", data.cuit)
    formData.append("rubro", data.rubro)
    formData.append("sitio", data.sitio)
    formData.append("email", data.email)
    formData.append("direccion", data.direccion)
    formData.append("ciudad", data.ciudad)
    formData.append("notas", data.notas)
    formData.append("activo", String(data.activo))
    // Contactos como JSON, filtrando los vacíos
    const contactosLimpios = data.contactos.filter(
      (c) => c.nombre.trim() || c.telefono.trim() || c.email.trim()
    )
    formData.append("contactos", JSON.stringify(contactosLimpios))

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) setError(result.error)
      else {
        router.push("/admin/proveedores")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/admin/proveedores" />}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar proveedor" : "Nuevo proveedor"}
          </h1>
        </div>
        <Button
          type="submit"
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda — Info del proveedor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información del proveedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nombre">Nombre / Razón social *</Label>
                <Input
                  id="nombre"
                  value={data.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rubro">Rubro</Label>
                <Input
                  id="rubro"
                  value={data.rubro}
                  onChange={(e) => set("rubro", e.target.value)}
                  placeholder="ej: Motos 0km, Cascos, Repuestos..."
                />
              </div>
              <div>
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={data.cuit}
                  onChange={(e) => set("cuit", e.target.value)}
                  placeholder="30-12345678-9"
                />
              </div>
              <div>
                <Label htmlFor="email">Email general</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="info@proveedor.com.ar"
                />
              </div>
              <div>
                <Label htmlFor="sitio">Sitio web</Label>
                <Input
                  id="sitio"
                  value={data.sitio}
                  onChange={(e) => set("sitio", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={data.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Av. Siempreviva 742"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={data.ciudad}
                  onChange={(e) => set("ciudad", e.target.value)}
                  placeholder="Bahía Blanca"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm pt-2">
              <input
                type="checkbox"
                checked={data.activo}
                onChange={(e) => set("activo", e.target.checked)}
                className="rounded accent-[#6B4F7A]"
              />
              Proveedor activo
            </label>
          </CardContent>
        </Card>

        {/* Columna derecha — Contactos */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-[#6B4F7A]" />
              Contactos
            </CardTitle>
            <button
              type="button"
              onClick={addContacto}
              className="inline-flex items-center gap-1 rounded-md bg-[#6B4F7A] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#8B6F9A] transition-colors"
            >
              <Plus className="size-3.5" />
              Agregar
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.contactos.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 dark:border-neutral-800 p-6 text-center">
                <UserPlus className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Sin contactos cargados.
                </p>
                <button
                  type="button"
                  onClick={addContacto}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#8B6F9A]"
                >
                  <Plus className="size-3.5" />
                  Agregar primer contacto
                </button>
              </div>
            )}

            {data.contactos.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4F7A]">
                    Contacto #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeContacto(c.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-300 transition-colors"
                    title="Eliminar contacto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div>
                  <Label htmlFor={`nombre-${c.id}`} className="text-xs">
                    Nombre
                  </Label>
                  <Input
                    id={`nombre-${c.id}`}
                    value={c.nombre}
                    onChange={(e) => updateContacto(c.id, "nombre", e.target.value)}
                    placeholder="Juan García"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`rol-${c.id}`} className="text-xs">
                    Rol / Sector
                  </Label>
                  <Input
                    id={`rol-${c.id}`}
                    value={c.rol}
                    onChange={(e) => updateContacto(c.id, "rol", e.target.value)}
                    placeholder="Ej: Administración"
                    list={`roles-${c.id}`}
                    className="h-9 text-sm"
                  />
                  <datalist id={`roles-${c.id}`}>
                    {ROLES_SUGERIDOS.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor={`tel-${c.id}`} className="text-xs">
                    Teléfono / Celular
                  </Label>
                  <Input
                    id={`tel-${c.id}`}
                    value={c.telefono}
                    onChange={(e) =>
                      updateContacto(c.id, "telefono", e.target.value)
                    }
                    placeholder="291 123-4567"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor={`email-${c.id}`} className="text-xs">
                    Email (opcional)
                  </Label>
                  <Input
                    id={`email-${c.id}`}
                    type="email"
                    value={c.email}
                    onChange={(e) => updateContacto(c.id, "email", e.target.value)}
                    placeholder="juan@proveedor.com"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ))}

            {data.contactos.length > 0 && (
              <button
                type="button"
                onClick={addContacto}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[#6B4F7A]/40 bg-[#6B4F7A]/5 hover:bg-[#6B4F7A]/10 px-3 py-2 text-xs font-semibold text-[#6B4F7A] transition-colors"
              >
                <Plus className="size-3.5" />
                Agregar otro contacto
              </button>
            )}
          </CardContent>
        </Card>

        {/* Notas - ancho completo abajo */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.notas}
              onChange={(e) => set("notas", e.target.value)}
              placeholder="Condiciones comerciales, plazos de pago, observaciones..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

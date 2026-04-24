"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

export type ProveedorData = {
  id?: string
  nombre: string
  contacto: string
  telefono: string
  email: string
  cuit: string
  direccion: string
  ciudad: string
  rubro: string
  sitio: string
  notas: string
  activo: boolean
}

const EMPTY: ProveedorData = {
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  cuit: "",
  direccion: "",
  ciudad: "",
  rubro: "",
  sitio: "",
  notas: "",
  activo: true,
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
  const [data, setData] = useState<ProveedorData>({ ...EMPTY, ...initialData })
  const [error, setError] = useState("")

  const set = <K extends keyof ProveedorData>(
    key: K,
    value: ProveedorData[K]
  ) => setData((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    Object.entries(data).forEach(([k, v]) =>
      formData.append(k, String(v ?? ""))
    )
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
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos del proveedor</CardTitle>
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
                <Label htmlFor="contacto">Persona de contacto</Label>
                <Input
                  id="contacto"
                  value={data.contacto}
                  onChange={(e) => set("contacto", e.target.value)}
                  placeholder="Ej: Juan García (comercial)"
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={data.telefono}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={data.direccion}
                onChange={(e) => set("direccion", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={data.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
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

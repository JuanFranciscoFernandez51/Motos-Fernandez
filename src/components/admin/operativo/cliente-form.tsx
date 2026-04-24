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

export type ClienteData = {
  id?: string
  dni: string
  cuit: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  telefonoAlt: string
  direccion: string
  ciudad: string
  provincia: string
  codigoPostal: string
  ocupacion: string
  notasInternas: string
}

const EMPTY: ClienteData = {
  dni: "",
  cuit: "",
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  telefonoAlt: "",
  direccion: "",
  ciudad: "Bahía Blanca",
  provincia: "Buenos Aires",
  codigoPostal: "",
  ocupacion: "",
  notasInternas: "",
}

export function ClienteForm({
  initialData,
  saveAction,
}: {
  initialData?: Partial<ClienteData> & { id?: string }
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<ClienteData>({
    ...EMPTY,
    ...initialData,
  })
  const [error, setError] = useState("")

  const set = <K extends keyof ClienteData>(key: K, value: ClienteData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.nombre.trim() || !data.apellido.trim()) {
      setError("Nombre y apellido son obligatorios")
      return
    }

    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    Object.entries(data).forEach(([k, v]) => formData.append(k, String(v ?? "")))

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/admin/clientes")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/clientes" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar cliente" : "Nuevo cliente"}
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
        {/* Identificación */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  value={data.apellido}
                  onChange={(e) => set("apellido", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={data.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={data.dni}
                  onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))}
                  placeholder="12345678"
                />
              </div>
              <div>
                <Label htmlFor="cuit">CUIT / CUIL</Label>
                <Input
                  id="cuit"
                  value={data.cuit}
                  onChange={(e) => set("cuit", e.target.value)}
                  placeholder="20-12345678-3"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ocupacion">Ocupación</Label>
                <Input
                  id="ocupacion"
                  value={data.ocupacion}
                  onChange={(e) => set("ocupacion", e.target.value)}
                  placeholder="Empleado, comerciante, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="telefono">Teléfono principal</Label>
              <Input
                id="telefono"
                value={data.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                placeholder="2915551234"
              />
            </div>
            <div>
              <Label htmlFor="telefonoAlt">Teléfono alternativo</Label>
              <Input
                id="telefonoAlt"
                value={data.telefonoAlt}
                onChange={(e) => set("telefonoAlt", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="cliente@mail.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="direccion">Calle y número</Label>
                <Input
                  id="direccion"
                  value={data.direccion}
                  onChange={(e) => set("direccion", e.target.value)}
                  placeholder="Av. Alem 123"
                />
              </div>
              <div>
                <Label htmlFor="codigoPostal">Código Postal</Label>
                <Input
                  id="codigoPostal"
                  value={data.codigoPostal}
                  onChange={(e) => set("codigoPostal", e.target.value)}
                  placeholder="8000"
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
              <div>
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={data.provincia}
                  onChange={(e) => set("provincia", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notas internas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Notas internas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.notasInternas}
              onChange={(e) => set("notasInternas", e.target.value)}
              placeholder="Información interna sobre el cliente (preferencias, historial, observaciones...)"
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

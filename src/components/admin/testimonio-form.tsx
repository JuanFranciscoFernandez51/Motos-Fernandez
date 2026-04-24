"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Star } from "lucide-react"
import Link from "next/link"
import { ImageUpload } from "@/components/admin/image-upload"

type TestimonioData = {
  id?: string
  nombre: string
  ubicacion: string
  modelo: string
  rating: number
  contenido: string
  foto: string
  destacado: boolean
  publicado: boolean
  orden: number
}

export function TestimonioForm({
  initialData,
  saveAction,
}: {
  initialData?: TestimonioData
  saveAction: (data: FormData) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [nombre, setNombre] = useState(initialData?.nombre || "")
  const [ubicacion, setUbicacion] = useState(initialData?.ubicacion || "")
  const [modelo, setModelo] = useState(initialData?.modelo || "")
  const [rating, setRating] = useState(initialData?.rating ?? 5)
  const [contenido, setContenido] = useState(initialData?.contenido || "")
  const [foto, setFoto] = useState(initialData?.foto || "")
  const [destacado, setDestacado] = useState(initialData?.destacado ?? false)
  const [publicado, setPublicado] = useState(initialData?.publicado ?? true)
  const [orden, setOrden] = useState(initialData?.orden ?? 0)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    formData.append("nombre", nombre)
    formData.append("ubicacion", ubicacion)
    formData.append("modelo", modelo)
    formData.append("rating", String(rating))
    formData.append("contenido", contenido)
    formData.append("foto", foto)
    formData.append("destacado", String(destacado))
    formData.append("publicado", String(publicado))
    formData.append("orden", String(orden))

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/admin/testimonios")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/testimonios" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar testimonio" : "Nuevo testimonio"}
          </h1>
        </div>
        <Button
          type="submit"
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
          disabled={isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info del cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Informacion del cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Juan Perez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Ubicacion</Label>
                  <Input
                    id="ubicacion"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Bahia Blanca"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Moto / producto</Label>
                <Input
                  id="modelo"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Honda XR 150L"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Opcional. Texto libre con el modelo o producto al que se refiere el testimonio.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rating y contenido */}
          <Card>
            <CardHeader>
              <CardTitle>Testimonio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Calificacion</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`h-7 w-7 ${
                          n <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {rating} / 5
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contenido">Contenido</Label>
                <Textarea
                  id="contenido"
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  rows={6}
                  placeholder="Escribi el testimonio del cliente..."
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Foto */}
          <Card>
            <CardHeader>
              <CardTitle>Foto del cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={foto}
                onChange={setFoto}
                folder="testimonios"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Opcional. Foto del cliente para mostrar junto al testimonio.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="publicado">Publicado</Label>
                <Switch
                  id="publicado"
                  checked={publicado}
                  onCheckedChange={setPublicado}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="destacado">Destacado</Label>
                <Switch
                  id="destacado"
                  checked={destacado}
                  onCheckedChange={setDestacado}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Menor numero aparece primero.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

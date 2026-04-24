"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save } from "lucide-react"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

interface NoticiaFormProps {
  initialData?: {
    id?: string
    titulo: string
    slug: string
    resumen: string
    contenido: string
    imagen: string
    categoria: string
    publicado: boolean
    destacado: boolean
    fechaPublicacion: string
  }
  saveAction: (formData: FormData) => Promise<{ error?: string }>
}

const CATEGORIAS = ["Noticias", "Novedades", "Consejos", "Eventos", "Productos"]

export function NoticiaForm({ initialData, saveAction }: NoticiaFormProps) {
  const [isPending, startTransition] = useTransition()

  const [titulo, setTitulo] = useState(initialData?.titulo || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [resumen, setResumen] = useState(initialData?.resumen || "")
  const [contenido, setContenido] = useState(initialData?.contenido || "")
  const [imagen, setImagen] = useState(initialData?.imagen || "")
  const [categoria, setCategoria] = useState(initialData?.categoria || "Noticias")
  const [publicado, setPublicado] = useState(initialData?.publicado ?? false)
  const [destacado, setDestacado] = useState(initialData?.destacado ?? false)
  const [fechaPublicacion, setFechaPublicacion] = useState(
    initialData?.fechaPublicacion || new Date().toISOString().split("T")[0]
  )
  const [error, setError] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.id)

  function handleTituloChange(value: string) {
    setTitulo(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugManuallyEdited(true)
  }

  function handleSubmit() {
    setError("")
    startTransition(async () => {
      const formData = new FormData()
      if (initialData?.id) formData.set("id", initialData.id)
      formData.set("titulo", titulo)
      formData.set("slug", slug)
      formData.set("resumen", resumen)
      formData.set("contenido", contenido)
      formData.set("imagen", imagen)
      formData.set("categoria", categoria)
      formData.set("publicado", String(publicado))
      formData.set("destacado", String(destacado))
      formData.set("fechaPublicacion", fechaPublicacion)

      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/noticias" />}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {initialData?.id ? "Editar noticia" : "Nueva noticia"}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Titulo *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => handleTituloChange(e.target.value)}
              placeholder="Titulo de la noticia"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="url-de-la-noticia"
            />
            <p className="text-xs text-gray-400">/noticias/{slug || "..."}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resumen">Resumen</Label>
            <Textarea
              id="resumen"
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              placeholder="Breve descripcion para listados y SEO"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contenido">Contenido (HTML) *</Label>
            <Textarea
              id="contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="<p>Texto de la noticia...</p>"
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="imagen">URL de imagen</Label>
            <Input
              id="imagen"
              value={imagen}
              onChange={(e) => setImagen(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => v && setCategoria(v)}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fechaPublicacion">Fecha de publicacion</Label>
              <Input
                id="fechaPublicacion"
                type="date"
                value={fechaPublicacion}
                onChange={(e) => setFechaPublicacion(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-8 pt-2">
            <div className="flex items-center gap-3">
              <Switch
                id="publicado"
                checked={publicado}
                onCheckedChange={setPublicado}
              />
              <Label htmlFor="publicado">Publicado</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="destacado"
                checked={destacado}
                onCheckedChange={setDestacado}
              />
              <Label htmlFor="destacado">Destacado</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isPending || !titulo || !slug || !contenido}
          className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
        >
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  )
}

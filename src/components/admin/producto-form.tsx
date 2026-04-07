"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react"
import { ImageUpload } from "@/components/admin/image-upload"

type CategoriaOption = { id: string; nombre: string }

type TalleStock = { talle: string; stock: string }

type ProductoData = {
  id?: string
  nombre: string
  slug: string
  codigo: string
  precio: string
  precioOferta: string
  descripcion: string
  fotos: string[]
  stock: string
  talles: TalleStock[]
  motoCompatible: string
  activo: boolean
  destacado: boolean
  categoriaId: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function ProductoForm({
  initialData,
  categorias,
  saveAction,
}: {
  initialData?: ProductoData
  categorias: CategoriaOption[]
  saveAction: (data: FormData) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [nombre, setNombre] = useState(initialData?.nombre || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [codigo, setCodigo] = useState(initialData?.codigo || "")
  const [precio, setPrecio] = useState(initialData?.precio || "")
  const [precioOferta, setPrecioOferta] = useState(initialData?.precioOferta || "")
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || "")
  const [fotos, setFotos] = useState<string[]>(
    initialData?.fotos?.length ? initialData.fotos : [""]
  )
  const [stock, setStock] = useState(initialData?.stock || "0")
  const [talles, setTalles] = useState<TalleStock[]>(
    initialData?.talles?.length ? initialData.talles : []
  )
  const [motoCompatible, setMotoCompatible] = useState(initialData?.motoCompatible || "")
  const [activo, setActivo] = useState(initialData?.activo ?? true)
  const [destacado, setDestacado] = useState(initialData?.destacado ?? false)
  const [categoriaId, setCategoriaId] = useState(
    initialData?.categoriaId || categorias[0]?.id || ""
  )
  const [error, setError] = useState("")

  const handleNombreChange = (value: string) => {
    setNombre(value)
    if (!initialData?.id) {
      setSlug(slugify(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    formData.append("nombre", nombre)
    formData.append("slug", slug)
    formData.append("codigo", codigo)
    formData.append("precio", precio)
    formData.append("precioOferta", precioOferta)
    formData.append("descripcion", descripcion)
    formData.append("fotos", JSON.stringify(fotos.filter((f) => f.trim())))
    formData.append("stock", stock)
    formData.append(
      "talles",
      JSON.stringify(talles.map((t) => t.talle).filter(Boolean))
    )
    const stockPorTalle: Record<string, number> = {}
    for (const t of talles) {
      if (t.talle) stockPorTalle[t.talle] = parseInt(t.stock) || 0
    }
    formData.append("stockPorTalle", JSON.stringify(stockPorTalle))
    formData.append("motoCompatible", motoCompatible)
    formData.append("activo", String(activo))
    formData.append("destacado", String(destacado))
    formData.append("categoriaId", categoriaId)

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/admin/productos")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/productos" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {initialData?.id ? "Editar producto" : "Nuevo producto"}
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
          {/* Info general */}
          <Card>
            <CardHeader>
              <CardTitle>Informacion general</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => handleNombreChange(e.target.value)}
                    placeholder="Casco LS2 FF800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="casco-ls2-ff800"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo (SKU)</Label>
                <Input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="LS2-FF800-M"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  placeholder="Descripcion del producto..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motoCompatible">Motos compatibles (repuestos)</Label>
                <Input
                  id="motoCompatible"
                  value={motoCompatible}
                  onChange={(e) => setMotoCompatible(e.target.value)}
                  placeholder="Honda XR 150L, Yamaha YBR 125..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Precio y stock */}
          <Card>
            <CardHeader>
              <CardTitle>Precio y Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio (ARS)</Label>
                  <Input
                    id="precio"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0"
                    required
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precioOferta">Precio oferta (opcional)</Label>
                  <Input
                    id="precioOferta"
                    type="number"
                    value={precioOferta}
                    onChange={(e) => setPrecioOferta(e.target.value)}
                    placeholder="Dejar vacio si no hay oferta"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock total</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Talles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Talles y Stock por talle</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTalles([...talles, { talle: "", stock: "0" }])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar talle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {talles.length === 0 && (
                <p className="text-sm text-gray-500">
                  Sin talles (producto sin variantes de talle)
                </p>
              )}
              {talles.map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="S, M, L, XL, 40, 41..."
                    value={t.talle}
                    onChange={(e) => {
                      const updated = [...talles]
                      updated[i] = { ...updated[i], talle: e.target.value }
                      setTalles(updated)
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={t.stock}
                    onChange={(e) => {
                      const updated = [...talles]
                      updated[i] = { ...updated[i], stock: e.target.value }
                      setTalles(updated)
                    }}
                    className="w-24"
                    min={0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => setTalles(talles.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Fotos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fotos</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFotos([...fotos, ""])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar foto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {fotos.map((foto, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <ImageUpload
                      value={foto}
                      onChange={(url) => {
                        const updated = [...fotos]
                        updated[i] = url
                        setFotos(updated)
                      }}
                      folder="productos"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-500 hover:text-red-700 mt-1"
                    onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoriaId} onValueChange={(v) => v && setCategoriaId(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activo">Activo</Label>
                <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="destacado">Destacado</Label>
                <Switch id="destacado" checked={destacado} onCheckedChange={setDestacado} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}

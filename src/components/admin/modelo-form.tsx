"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import Link from "next/link"
import { CATEGORIAS_VEHICULO, ETIQUETAS_MODELO } from "@/lib/constants"
import { ImageUpload } from "@/components/admin/image-upload"
import { MultiImageUpload } from "@/components/admin/multi-image-upload"

type ModeloColor = {
  id?: string
  nombre: string
  hex: string
  foto: string
}

type FinanciacionEntry = {
  plan: string
  cuota: string
  entrega: string
  detalle: string
}

type SpecEntry = {
  key: string
  value: string
}

type ModeloData = {
  id?: string
  nombre: string
  slug: string
  marca: string
  categoriaVehiculo: string
  condicion: string
  anio: number | null
  kilometros: number | null
  observaciones: string
  cilindrada: string
  precio: number | null
  moneda: string
  descripcion: string
  specs: SpecEntry[]
  financiacion: FinanciacionEntry[]
  colores: ModeloColor[]
  fotos: string[]
  activo: boolean
  destacado: boolean
  etiqueta: string | null
  orden: number
  // Datos internos (solo admin)
  chasis?: string | null
  motor?: string | null
  patente?: string | null
  clienteNombre?: string | null
  clienteContacto?: string | null
  notasInternas?: string | null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function ModeloForm({
  initialData,
  saveAction,
}: {
  initialData?: ModeloData
  saveAction: (data: FormData) => Promise<{ error?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [nombre, setNombre] = useState(initialData?.nombre || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [marca, setMarca] = useState(initialData?.marca || "")
  const [categoriaVehiculo, setCategoriaVehiculo] = useState(
    initialData?.categoriaVehiculo || "MOTOCICLETA"
  )
  const [condicion, setCondicion] = useState(initialData?.condicion || "0KM")
  const [anio, setAnio] = useState(
    initialData?.anio != null ? String(initialData.anio) : String(new Date().getFullYear())
  )
  const [kilometros, setKilometros] = useState(
    initialData?.kilometros != null ? String(initialData.kilometros) : ""
  )
  const [observaciones, setObservaciones] = useState(initialData?.observaciones || "")
  const [cilindrada, setCilindrada] = useState(initialData?.cilindrada || "")
  const [precio, setPrecio] = useState(
    initialData?.precio != null ? String(initialData.precio) : ""
  )
  const [moneda, setMoneda] = useState(initialData?.moneda || "ARS")
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || "")
  const [specs, setSpecs] = useState<SpecEntry[]>(
    initialData?.specs?.length ? initialData.specs : [{ key: "", value: "" }]
  )
  const [financiacion, setFinanciacion] = useState<FinanciacionEntry[]>(
    initialData?.financiacion?.length ? initialData.financiacion : []
  )
  const [colores, setColores] = useState<ModeloColor[]>(
    initialData?.colores?.length
      ? initialData.colores
      : [{ nombre: "", hex: "#000000", foto: "" }]
  )
  const [fotos, setFotos] = useState<string[]>(initialData?.fotos || [])
  const [activo, setActivo] = useState(initialData?.activo ?? true)
  const [destacado, setDestacado] = useState(initialData?.destacado ?? false)
  const [etiqueta, setEtiqueta] = useState<string>(initialData?.etiqueta || "NONE")
  const [orden, setOrden] = useState(initialData?.orden ?? 0)
  // Datos internos (solo admin)
  const [chasis, setChasis] = useState(initialData?.chasis || "")
  const [motor, setMotor] = useState(initialData?.motor || "")
  const [patente, setPatente] = useState(initialData?.patente || "")
  const [clienteNombre, setClienteNombre] = useState(initialData?.clienteNombre || "")
  const [clienteContacto, setClienteContacto] = useState(initialData?.clienteContacto || "")
  const [notasInternas, setNotasInternas] = useState(initialData?.notasInternas || "")
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
    formData.append("marca", marca)
    formData.append("categoriaVehiculo", categoriaVehiculo)
    formData.append("condicion", condicion)
    formData.append("anio", anio)
    formData.append("kilometros", kilometros)
    formData.append("observaciones", observaciones)
    formData.append("cilindrada", cilindrada)
    formData.append("moneda", moneda)
    formData.append("precio", precio)
    formData.append("descripcion", descripcion)
    formData.append("specs", JSON.stringify(specs.filter((s) => s.key.trim())))
    formData.append(
      "financiacion",
      JSON.stringify(
        financiacion
          .filter((f) => f.plan.trim())
          .map((f) => ({
            plan: f.plan,
            cuota: f.cuota ? parseInt(f.cuota) : null,
            entrega: f.entrega ? parseInt(f.entrega) : null,
            detalle: f.detalle || null,
          }))
      )
    )
    formData.append("colores", JSON.stringify(colores.filter((c) => c.nombre.trim())))
    formData.append("fotos", JSON.stringify(fotos.filter((f) => f.trim())))
    formData.append("activo", String(activo))
    formData.append("destacado", String(destacado))
    formData.append("etiqueta", etiqueta === "NONE" ? "" : etiqueta)
    formData.append("orden", String(orden))
    // Datos internos (solo admin)
    formData.append("chasis", chasis)
    formData.append("motor", motor)
    formData.append("patente", patente)
    formData.append("clienteNombre", clienteNombre)
    formData.append("clienteContacto", clienteContacto)
    formData.append("notasInternas", notasInternas)

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/admin/modelos")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/modelos" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {initialData?.id ? "Editar modelo" : "Nuevo modelo"}
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
                    placeholder="Honda XR 150L"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="honda-xr-150l"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Honda, Yamaha, Suzuki..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={categoriaVehiculo} onValueChange={(v) => v && setCategoriaVehiculo(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_VEHICULO.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cilindrada">Cilindrada</Label>
                  <Input
                    id="cilindrada"
                    value={cilindrada}
                    onChange={(e) => setCilindrada(e.target.value)}
                    placeholder="150cc, 250cc..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condicion">Condicion</Label>
                  <Select value={condicion} onValueChange={(v) => v && setCondicion(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0KM">0KM</SelectItem>
                      <SelectItem value="USADA">Usada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anio">Año</Label>
                  <Input
                    id="anio"
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    placeholder="2026"
                  />
                </div>
                {condicion === "USADA" && (
                  <div className="space-y-2">
                    <Label htmlFor="kilometros">Kilometros</Label>
                    <Input
                      id="kilometros"
                      type="number"
                      value={kilometros}
                      onChange={(e) => setKilometros(e.target.value)}
                      placeholder="15000"
                    />
                  </div>
                )}
              </div>
              {condicion === "USADA" && (
                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Ej: Tiene protector de carter, sliders, escape Leovince..."
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="precio">Precio</Label>
                  <Input
                    id="precio"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Dejar vacio para 'Consultar'"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select value={moneda} onValueChange={(v) => v && setMoneda(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">$ ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={4}
                  placeholder="Descripcion del modelo..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Specs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Especificaciones</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSpecs([...specs, { key: "", value: "" }])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {specs.map((spec, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Ej: Motor"
                    value={spec.key}
                    onChange={(e) => {
                      const updated = [...specs]
                      updated[i] = { ...updated[i], key: e.target.value }
                      setSpecs(updated)
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Ej: 150cc monocilindrico"
                    value={spec.value}
                    onChange={(e) => {
                      const updated = [...specs]
                      updated[i] = { ...updated[i], value: e.target.value }
                      setSpecs(updated)
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financiacion */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Financiacion</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFinanciacion([
                      ...financiacion,
                      { plan: "", cuota: "", entrega: "", detalle: "" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar plan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {financiacion.length === 0 && (
                <p className="text-sm text-gray-500">
                  No hay planes de financiacion. Agrega uno para mostrar en el detalle del modelo.
                </p>
              )}
              {financiacion.map((fin, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Ej: 12 cuotas sin interes"
                      value={fin.plan}
                      onChange={(e) => {
                        const updated = [...financiacion]
                        updated[i] = { ...updated[i], plan: e.target.value }
                        setFinanciacion(updated)
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-red-500 hover:text-red-700"
                      onClick={() => setFinanciacion(financiacion.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Cuota mensual ($)"
                      value={fin.cuota}
                      onChange={(e) => {
                        const updated = [...financiacion]
                        updated[i] = { ...updated[i], cuota: e.target.value }
                        setFinanciacion(updated)
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Entrega inicial ($)"
                      value={fin.entrega}
                      onChange={(e) => {
                        const updated = [...financiacion]
                        updated[i] = { ...updated[i], entrega: e.target.value }
                        setFinanciacion(updated)
                      }}
                    />
                  </div>
                  <Input
                    placeholder="Detalle adicional (opcional)"
                    value={fin.detalle}
                    onChange={(e) => {
                      const updated = [...financiacion]
                      updated[i] = { ...updated[i], detalle: e.target.value }
                      setFinanciacion(updated)
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Colores */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Colores</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setColores([...colores, { nombre: "", hex: "#000000", foto: "" }])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar color
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {colores.map((color, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center border rounded-lg p-3">
                  <Input
                    placeholder="Nombre del color"
                    value={color.nombre}
                    onChange={(e) => {
                      const updated = [...colores]
                      updated[i] = { ...updated[i], nombre: e.target.value }
                      setColores(updated)
                    }}
                    className="flex-1 min-w-[150px]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color.hex}
                      onChange={(e) => {
                        const updated = [...colores]
                        updated[i] = { ...updated[i], hex: e.target.value }
                        setColores(updated)
                      }}
                      className="h-9 w-9 rounded border cursor-pointer"
                    />
                    <Input
                      value={color.hex}
                      onChange={(e) => {
                        const updated = [...colores]
                        updated[i] = { ...updated[i], hex: e.target.value }
                        setColores(updated)
                      }}
                      className="w-24"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <ImageUpload
                      value={color.foto}
                      onChange={(url) => {
                        const updated = [...colores]
                        updated[i] = { ...updated[i], foto: url }
                        setColores(updated)
                      }}
                      folder="modelos"
                      className="h-20"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => setColores(colores.filter((_, j) => j !== i))}
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
              <CardTitle>Fotos</CardTitle>
            </CardHeader>
            <CardContent>
              <MultiImageUpload
                value={fotos}
                onChange={setFotos}
                folder="modelos"
              />
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
                <Label htmlFor="activo">Activo</Label>
                <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="destacado">Destacado</Label>
                <Switch id="destacado" checked={destacado} onCheckedChange={setDestacado} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="etiqueta">Etiqueta</Label>
                <Select value={etiqueta} onValueChange={(v) => v && setEtiqueta(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sin etiqueta</SelectItem>
                    {ETIQUETAS_MODELO.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== Información interna (solo admin) ========== */}
      <Card className="border-yellow-200 bg-yellow-50/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
              🔒
            </div>
            <div>
              <CardTitle className="text-yellow-900">
                Información interna — solo admin
              </CardTitle>
              <p className="mt-1 text-xs text-yellow-800/80">
                Estos datos NO se muestran en la web pública. Son solo para tu
                uso interno.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chasis">Número de chasis</Label>
              <Input
                id="chasis"
                value={chasis}
                onChange={(e) => setChasis(e.target.value)}
                placeholder="ej: 9BWHE21JX24060960"
              />
            </div>
            <div>
              <Label htmlFor="motor">Número de motor</Label>
              <Input
                id="motor"
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                placeholder="ej: 162FMJ-E-12345"
              />
            </div>
            <div>
              <Label htmlFor="patente">Patente</Label>
              <Input
                id="patente"
                value={patente}
                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                placeholder="ej: AA123BB"
              />
            </div>
            <div>
              <Label htmlFor="clienteNombre">Cliente (nombre)</Label>
              <Input
                id="clienteNombre"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="ej: Juan Pérez"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="clienteContacto">Cliente (contacto)</Label>
              <Input
                id="clienteContacto"
                value={clienteContacto}
                onChange={(e) => setClienteContacto(e.target.value)}
                placeholder="teléfono, email, DNI..."
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notasInternas">Notas internas</Label>
              <Textarea
                id="notasInternas"
                value={notasInternas}
                onChange={(e) => setNotasInternas(e.target.value)}
                placeholder="Cualquier dato interno que quieras recordar sobre esta moto..."
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

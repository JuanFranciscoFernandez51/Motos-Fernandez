"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Plus, Trash2, ArrowLeft, Save, Sparkles, Loader2 } from "lucide-react"
import { ClienteSelector } from "./operativo/cliente-selector"
import Link from "next/link"
import { CATEGORIAS_VEHICULO, ETIQUETAS_MODELO } from "@/lib/constants"
import { ImageUpload } from "@/components/admin/image-upload"
import { MultiImageUpload } from "@/components/admin/multi-image-upload"
import { mejorarFoto, fondoBlancoFoto, fotoOriginal } from "@/lib/cloudinary-mejora"

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
  transmision?: string | null
  combustible?: string | null
  color?: string | null
  // Atributos opcionales para ML
  frenos?: string | null
  tipoMotor?: string | null
  potenciaHp?: number | null
  garantiaFabrica?: boolean | null
  aceptaPermuta?: boolean | null
  precioNegociable?: boolean | null
  unicoDueno?: boolean | null
  tieneAlarma?: boolean | null
  entradaUsb?: boolean | null
  distanciaEjesCm?: number | null
  largoMm?: number | null
  alturaMm?: number | null
  anchoMm?: number | null
  pesoKg?: number | null
  // Equipamiento extra
  marcaMotor?: string | null
  capacidadTanque?: number | null
  sistemaArranque?: string | null
  velocidadMaxima?: number | null
  numeroVelocidades?: number | null
  alturaAsiento?: number | null
  gps?: boolean | null
  eficienciaKmL?: number | null
  // Batería (eléctricas)
  tipoBateria?: string | null
  cantidadBaterias?: number | null
  capacidadBateria?: number | null
  voltajeBateria?: number | null
  autonomiaKm?: number | null
  tiempoCarga?: number | null
  pesoBateriaG?: number | null
  tipoCargador?: string | null
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
  proveedorId?: string | null      // 0KM: de quien compramos la moto
  clienteEntregaId?: string | null // USADA: el que la entregó (dueño anterior)
  clienteNombre?: string | null    // legacy texto libre (Cardfile import)
  clienteContacto?: string | null  // legacy texto libre (Cardfile import)
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
  clientes = [],
  proveedores = [],
  extraActions,
}: {
  initialData?: ModeloData
  saveAction: (data: FormData) => Promise<{ error?: string }>
  clientes?: import("./operativo/cliente-selector").ClienteOption[]
  proveedores?: { id: string; nombre: string }[]
  // Botones extra que aparecen en el header al lado de "Guardar".
  // Usado por la pagina de editar para "Vender" y "Borrar".
  extraActions?: React.ReactNode
}) {
  const router = useRouter()
  // Si el usuario llego desde Stock motos (con ?volver=stock), al guardar
  // / cancelar volvemos ahi en vez de a /admin/modelos.
  const searchParams = useSearchParams()
  const volverA =
    searchParams?.get("volver") === "stock"
      ? "/admin/stock-motos"
      : "/admin/modelos"
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
  const [transmision, setTransmision] = useState(initialData?.transmision || "Manual")
  const [combustible, setCombustible] = useState(initialData?.combustible || "Nafta")
  const [color, setColor] = useState(initialData?.color || "")
  // Atributos opcionales para ML
  const [frenos, setFrenos] = useState(initialData?.frenos || "")
  const [tipoMotor, setTipoMotor] = useState(initialData?.tipoMotor || "")
  const [potenciaHp, setPotenciaHp] = useState(
    initialData?.potenciaHp != null ? String(initialData.potenciaHp) : ""
  )
  const [garantiaFabrica, setGarantiaFabrica] = useState(initialData?.garantiaFabrica ?? false)
  const [aceptaPermuta, setAceptaPermuta] = useState(initialData?.aceptaPermuta ?? true)
  const [precioNegociable, setPrecioNegociable] = useState(initialData?.precioNegociable ?? true)
  const [unicoDueno, setUnicoDueno] = useState(initialData?.unicoDueno ?? false)
  const [tieneAlarma, setTieneAlarma] = useState(initialData?.tieneAlarma ?? false)
  const [entradaUsb, setEntradaUsb] = useState(initialData?.entradaUsb ?? false)
  const [distanciaEjesCm, setDistanciaEjesCm] = useState(
    initialData?.distanciaEjesCm != null ? String(initialData.distanciaEjesCm) : ""
  )
  const [largoMm, setLargoMm] = useState(
    initialData?.largoMm != null ? String(initialData.largoMm) : ""
  )
  const [alturaMm, setAlturaMm] = useState(
    initialData?.alturaMm != null ? String(initialData.alturaMm) : ""
  )
  const [anchoMm, setAnchoMm] = useState(
    initialData?.anchoMm != null ? String(initialData.anchoMm) : ""
  )
  const [pesoKg, setPesoKg] = useState(
    initialData?.pesoKg != null ? String(initialData.pesoKg) : ""
  )
  // Equipamiento extra
  const [marcaMotor, setMarcaMotor] = useState(initialData?.marcaMotor || "")
  const [capacidadTanque, setCapacidadTanque] = useState(
    initialData?.capacidadTanque != null ? String(initialData.capacidadTanque) : ""
  )
  const [sistemaArranque, setSistemaArranque] = useState(initialData?.sistemaArranque || "")
  const [velocidadMaxima, setVelocidadMaxima] = useState(
    initialData?.velocidadMaxima != null ? String(initialData.velocidadMaxima) : ""
  )
  const [numeroVelocidades, setNumeroVelocidades] = useState(
    initialData?.numeroVelocidades != null ? String(initialData.numeroVelocidades) : ""
  )
  const [alturaAsiento, setAlturaAsiento] = useState(
    initialData?.alturaAsiento != null ? String(initialData.alturaAsiento) : ""
  )
  const [gps, setGps] = useState(initialData?.gps ?? false)
  const [eficienciaKmL, setEficienciaKmL] = useState(
    initialData?.eficienciaKmL != null ? String(initialData.eficienciaKmL) : ""
  )
  // Bateria (eléctricas)
  const [tipoBateria, setTipoBateria] = useState(initialData?.tipoBateria || "")
  const [cantidadBaterias, setCantidadBaterias] = useState(
    initialData?.cantidadBaterias != null ? String(initialData.cantidadBaterias) : ""
  )
  const [capacidadBateria, setCapacidadBateria] = useState(
    initialData?.capacidadBateria != null ? String(initialData.capacidadBateria) : ""
  )
  const [voltajeBateria, setVoltajeBateria] = useState(
    initialData?.voltajeBateria != null ? String(initialData.voltajeBateria) : ""
  )
  const [autonomiaKm, setAutonomiaKm] = useState(
    initialData?.autonomiaKm != null ? String(initialData.autonomiaKm) : ""
  )
  const [tiempoCarga, setTiempoCarga] = useState(
    initialData?.tiempoCarga != null ? String(initialData.tiempoCarga) : ""
  )
  const [pesoBateriaG, setPesoBateriaG] = useState(
    initialData?.pesoBateriaG != null ? String(initialData.pesoBateriaG) : ""
  )
  const [tipoCargador, setTipoCargador] = useState(initialData?.tipoCargador || "")
  const [showMLFields, setShowMLFields] = useState(false)
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
  const [proveedorId, setProveedorId] = useState(initialData?.proveedorId || "")
  const [clienteEntregaId, setClienteEntregaId] = useState(initialData?.clienteEntregaId || "")
  const [clienteNombre, setClienteNombre] = useState(initialData?.clienteNombre || "")
  const [clienteContacto, setClienteContacto] = useState(initialData?.clienteContacto || "")
  const [notasInternas, setNotasInternas] = useState(initialData?.notasInternas || "")
  const [error, setError] = useState("")
  // IA para specs
  const [loadingIA, setLoadingIA] = useState(false)
  const [iaError, setIaError] = useState("")

  const autocompletarSpecs = async () => {
    setIaError("")
    if (!marca.trim() || !nombre.trim()) {
      setIaError("Cargá marca y nombre del modelo primero")
      return
    }
    setLoadingIA(true)
    try {
      const res = await fetch("/api/admin/specs-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca,
          modelo: nombre.replace(marca, "").trim() || nombre,
          anio: anio ? parseInt(anio) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setIaError(data.error || "Error consultando la IA")
        return
      }
      const specsObj = data.specs as Record<string, string>
      const entries = Object.entries(specsObj).map(([key, value]) => ({
        key,
        value,
      }))
      if (entries.length === 0) {
        setIaError(
          "La IA no encontró specs confiables para esta moto. Cargalas manualmente."
        )
        return
      }
      // Merge con specs existentes (nuevas ganan)
      const existingKeys = new Set(entries.map((e) => e.key))
      const keep = specs.filter((s) => s.key.trim() && !existingKeys.has(s.key))
      setSpecs([...entries, ...keep])
    } catch (err) {
      setIaError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoadingIA(false)
    }
  }

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
    formData.append("transmision", transmision)
    formData.append("combustible", combustible)
    formData.append("color", color)
    // ML opcionales
    formData.append("frenos", frenos)
    formData.append("tipoMotor", tipoMotor)
    formData.append("potenciaHp", potenciaHp)
    formData.append("garantiaFabrica", String(garantiaFabrica))
    formData.append("aceptaPermuta", String(aceptaPermuta))
    formData.append("precioNegociable", String(precioNegociable))
    formData.append("unicoDueno", String(unicoDueno))
    formData.append("tieneAlarma", String(tieneAlarma))
    formData.append("entradaUsb", String(entradaUsb))
    formData.append("distanciaEjesCm", distanciaEjesCm)
    formData.append("largoMm", largoMm)
    formData.append("alturaMm", alturaMm)
    formData.append("anchoMm", anchoMm)
    formData.append("pesoKg", pesoKg)
    // Equipamiento extra
    formData.append("marcaMotor", marcaMotor)
    formData.append("capacidadTanque", capacidadTanque)
    formData.append("sistemaArranque", sistemaArranque)
    formData.append("velocidadMaxima", velocidadMaxima)
    formData.append("numeroVelocidades", numeroVelocidades)
    formData.append("alturaAsiento", alturaAsiento)
    formData.append("gps", String(gps))
    formData.append("eficienciaKmL", eficienciaKmL)
    formData.append("tipoBateria", tipoBateria)
    formData.append("cantidadBaterias", cantidadBaterias)
    formData.append("capacidadBateria", capacidadBateria)
    formData.append("voltajeBateria", voltajeBateria)
    formData.append("autonomiaKm", autonomiaKm)
    formData.append("tiempoCarga", tiempoCarga)
    formData.append("pesoBateriaG", pesoBateriaG)
    formData.append("tipoCargador", tipoCargador)
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
    formData.append("proveedorId", proveedorId)
    formData.append("clienteEntregaId", clienteEntregaId)
    formData.append("clienteNombre", clienteNombre)
    formData.append("clienteContacto", clienteContacto)
    formData.append("notasInternas", notasInternas)

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push(volverA)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href={volverA} />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar modelo" : "Nuevo modelo"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          <Button
            type="submit"
            className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
            disabled={isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600">{error}</div>
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
              {/* Atributos requeridos por Mercado Libre */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-neutral-800">
                <div className="space-y-2">
                  <Label htmlFor="transmision">
                    Transmisión
                    <span className="text-[10px] text-gray-400 ml-1">(ML)</span>
                  </Label>
                  <select
                    id="transmision"
                    value={transmision}
                    onChange={(e) => setTransmision(e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automática">Automática</option>
                    <option value="Semiautomática">Semiautomática</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="combustible">
                    Combustible
                    <span className="text-[10px] text-gray-400 ml-1">(ML)</span>
                  </Label>
                  <select
                    id="combustible"
                    value={combustible}
                    onChange={(e) => setCombustible(e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                  >
                    <option value="Nafta">Nafta</option>
                    <option value="Eléctrica">Eléctrica</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">
                    Color
                    <span className="text-[10px] text-gray-400 ml-1">(ML)</span>
                  </Label>
                  <Input
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Negro, Rojo, Azul..."
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

          {/* Datos para Mercado Libre — opcional, mejora la calidad de la publicación */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  Datos para Mercado Libre
                  <span className="text-[10px] font-normal text-gray-400">(opcionales)</span>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMLFields((v) => !v)}
                  className="text-xs"
                >
                  {showMLFields ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cuanto más completes, mejor calidad y posicionamiento tendrá la publicación en ML.
                Todos son opcionales — si quedan vacíos, ML simplemente los omite.
              </p>
            </CardHeader>
            {showMLFields && (
              <CardContent className="space-y-4">
                {/* Características principales */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Características principales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frenos">Frenos</Label>
                      <select
                        id="frenos"
                        value={frenos}
                        onChange={(e) => setFrenos(e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                      >
                        <option value="">— Sin especificar —</option>
                        <option value="Delantero y trasero">Delantero y trasero</option>
                        <option value="Solo delantero">Solo delantero</option>
                        <option value="Solo trasero">Solo trasero</option>
                        <option value="ABS">ABS</option>
                        <option value="Disco hidráulico">Disco hidráulico</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoMotor">Motor (tiempos)</Label>
                      <select
                        id="tipoMotor"
                        value={tipoMotor}
                        onChange={(e) => setTipoMotor(e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                      >
                        <option value="">— Sin especificar —</option>
                        <option value="4 tiempos">4 tiempos</option>
                        <option value="2 tiempos">2 tiempos</option>
                        <option value="Eléctrico">Eléctrico</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="potenciaHp">Potencia (HP)</Label>
                      <Input
                        id="potenciaHp"
                        type="number"
                        value={potenciaHp}
                        onChange={(e) => setPotenciaHp(e.target.value)}
                        placeholder="Ej: 23"
                      />
                    </div>
                  </div>
                </div>

                {/* Garantía y condiciones */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold">Garantía y condiciones</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2">
                      <span className="text-sm">Garantía de fábrica</span>
                      <Switch checked={garantiaFabrica} onCheckedChange={setGarantiaFabrica} />
                    </label>
                    <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2">
                      <span className="text-sm">Acepta permuta</span>
                      <Switch checked={aceptaPermuta} onCheckedChange={setAceptaPermuta} />
                    </label>
                    <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2">
                      <span className="text-sm">Precio negociable</span>
                      <Switch checked={precioNegociable} onCheckedChange={setPrecioNegociable} />
                    </label>
                    {condicion === "USADA" && (
                      <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2">
                        <span className="text-sm">Único dueño</span>
                        <Switch checked={unicoDueno} onCheckedChange={setUnicoDueno} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Equipamiento */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold">Seguridad y entretenimiento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2">
                      <span className="text-sm">Alarma</span>
                      <Switch checked={tieneAlarma} onCheckedChange={setTieneAlarma} />
                    </label>
                    <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2">
                      <span className="text-sm">Entrada USB</span>
                      <Switch checked={entradaUsb} onCheckedChange={setEntradaUsb} />
                    </label>
                  </div>
                </div>

                {/* Equipamiento */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold">Equipamiento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="marcaMotor" className="text-xs">Marca del motor</Label>
                      <Input
                        id="marcaMotor"
                        value={marcaMotor}
                        onChange={(e) => setMarcaMotor(e.target.value)}
                        placeholder="Honda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacidadTanque" className="text-xs">Capacidad del tanque (cc)</Label>
                      <Input
                        id="capacidadTanque"
                        type="number"
                        value={capacidadTanque}
                        onChange={(e) => setCapacidadTanque(e.target.value)}
                        placeholder="12000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sistemaArranque" className="text-xs">Sistema de arranque</Label>
                      <select
                        id="sistemaArranque"
                        value={sistemaArranque}
                        onChange={(e) => setSistemaArranque(e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                      >
                        <option value="">— Sin especificar —</option>
                        <option value="Eléctrico">Eléctrico</option>
                        <option value="A patada">A patada</option>
                        <option value="Eléctrico y a patada">Eléctrico y a patada</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="velocidadMaxima" className="text-xs">Velocidad máxima (km/h)</Label>
                      <Input
                        id="velocidadMaxima"
                        type="number"
                        value={velocidadMaxima}
                        onChange={(e) => setVelocidadMaxima(e.target.value)}
                        placeholder="130"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numeroVelocidades" className="text-xs">N° de velocidades</Label>
                      <Input
                        id="numeroVelocidades"
                        type="number"
                        value={numeroVelocidades}
                        onChange={(e) => setNumeroVelocidades(e.target.value)}
                        placeholder="6"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alturaAsiento" className="text-xs">Altura del asiento (cm)</Label>
                      <Input
                        id="alturaAsiento"
                        type="number"
                        value={alturaAsiento}
                        onChange={(e) => setAlturaAsiento(e.target.value)}
                        placeholder="85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eficienciaKmL" className="text-xs">Consumo (km/l)</Label>
                      <Input
                        id="eficienciaKmL"
                        type="number"
                        step="0.1"
                        value={eficienciaKmL}
                        onChange={(e) => setEficienciaKmL(e.target.value)}
                        placeholder="35"
                      />
                    </div>
                    <label className="flex items-center justify-between rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 self-end h-10">
                      <span className="text-sm">GPS</span>
                      <Switch checked={gps} onCheckedChange={setGps} />
                    </label>
                  </div>
                </div>

                {/* Bateria - solo si combustible es Eléctrica */}
                {combustible === "Eléctrica" && (
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
                    <h3 className="text-sm font-semibold">Batería</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="tipoBateria" className="text-xs">Tipo</Label>
                        <Input
                          id="tipoBateria"
                          value={tipoBateria}
                          onChange={(e) => setTipoBateria(e.target.value)}
                          placeholder="Litio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cantidadBaterias" className="text-xs">Cantidad</Label>
                        <Input
                          id="cantidadBaterias"
                          type="number"
                          value={cantidadBaterias}
                          onChange={(e) => setCantidadBaterias(e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacidadBateria" className="text-xs">Capacidad (Ah)</Label>
                        <Input
                          id="capacidadBateria"
                          type="number"
                          step="0.1"
                          value={capacidadBateria}
                          onChange={(e) => setCapacidadBateria(e.target.value)}
                          placeholder="20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="voltajeBateria" className="text-xs">Voltaje (V)</Label>
                        <Input
                          id="voltajeBateria"
                          type="number"
                          step="0.1"
                          value={voltajeBateria}
                          onChange={(e) => setVoltajeBateria(e.target.value)}
                          placeholder="72"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="autonomiaKm" className="text-xs">Autonomía (km)</Label>
                        <Input
                          id="autonomiaKm"
                          type="number"
                          value={autonomiaKm}
                          onChange={(e) => setAutonomiaKm(e.target.value)}
                          placeholder="80"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiempoCarga" className="text-xs">Tiempo carga (h)</Label>
                        <Input
                          id="tiempoCarga"
                          type="number"
                          step="0.5"
                          value={tiempoCarga}
                          onChange={(e) => setTiempoCarga(e.target.value)}
                          placeholder="4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pesoBateriaG" className="text-xs">Peso batería (g)</Label>
                        <Input
                          id="pesoBateriaG"
                          type="number"
                          value={pesoBateriaG}
                          onChange={(e) => setPesoBateriaG(e.target.value)}
                          placeholder="8000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipoCargador" className="text-xs">Tipo cargador</Label>
                        <Input
                          id="tipoCargador"
                          value={tipoCargador}
                          onChange={(e) => setTipoCargador(e.target.value)}
                          placeholder="Estándar 220V"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Dimensiones */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold">Dimensiones y peso</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="distanciaEjesCm" className="text-xs">
                        Distancia ejes (cm)
                      </Label>
                      <Input
                        id="distanciaEjesCm"
                        type="number"
                        value={distanciaEjesCm}
                        onChange={(e) => setDistanciaEjesCm(e.target.value)}
                        placeholder="135"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="largoMm" className="text-xs">
                        Largo (mm)
                      </Label>
                      <Input
                        id="largoMm"
                        type="number"
                        value={largoMm}
                        onChange={(e) => setLargoMm(e.target.value)}
                        placeholder="2150"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alturaMm" className="text-xs">
                        Altura (mm)
                      </Label>
                      <Input
                        id="alturaMm"
                        type="number"
                        value={alturaMm}
                        onChange={(e) => setAlturaMm(e.target.value)}
                        placeholder="1180"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="anchoMm" className="text-xs">
                        Ancho (mm)
                      </Label>
                      <Input
                        id="anchoMm"
                        type="number"
                        value={anchoMm}
                        onChange={(e) => setAnchoMm(e.target.value)}
                        placeholder="800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pesoKg" className="text-xs">
                        Peso (kg)
                      </Label>
                      <Input
                        id="pesoKg"
                        type="number"
                        value={pesoKg}
                        onChange={(e) => setPesoKg(e.target.value)}
                        placeholder="135"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Specs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle>Especificaciones</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={autocompletarSpecs}
                    disabled={loadingIA}
                    className="border-[#7C3AED]/40 text-[#7C3AED] hover:bg-[#7C3AED]/5"
                  >
                    {loadingIA ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Autocompletar con IA
                  </Button>
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
              </div>
              {iaError && (
                <p className="mt-2 text-xs text-red-600">{iaError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                La IA busca las specs por marca, modelo y año. Reemplaza
                las claves que ya existan con los datos nuevos, mantiene las custom.
              </p>
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
                    className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-300"
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                      className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-300"
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
                    className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-300"
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
              {fotos.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-neutral-800 pt-3">
                  <span className="text-xs font-medium text-gray-500">✨ Mejorar con IA:</span>
                  <button
                    type="button"
                    onClick={() => setFotos((fs) => fs.map(mejorarFoto))}
                    className="rounded-md bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-1 text-xs font-medium hover:bg-[#7C3AED]/20"
                    title="Auto-mejora de luz, color y nitidez en todas las fotos"
                  >
                    Mejorar luz y color
                  </button>
                  <button
                    type="button"
                    onClick={() => setFotos((fs) => fs.map(fondoBlancoFoto))}
                    className="rounded-md bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-1 text-xs font-medium hover:bg-[#7C3AED]/20"
                    title="Quita el fondo y lo deja blanco (look de catálogo)"
                  >
                    Quitar fondo (blanco)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFotos((fs) => fs.map(fotoOriginal))}
                    className="rounded-md border border-gray-300 dark:border-neutral-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900"
                    title="Volver a las fotos originales"
                  >
                    Volver al original
                  </button>
                  <span className="w-full text-[11px] text-gray-400">
                    Se aplica a todas las fotos de la moto. Es reversible. Acordate de tocar <strong>Guardar</strong>.
                  </span>
                </div>
              )}
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
      <Card className="border-yellow-200 dark:border-yellow-900/40 bg-yellow-50/30 dark:bg-yellow-950/30">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700">
              🔒
            </div>
            <div>
              <CardTitle className="text-yellow-900">
                Información interna — solo admin
              </CardTitle>
              <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-300/80">
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
            {/* Origen segun condicion: 0KM -> proveedor, USADA -> cliente
                que la entregó. El comprador se asigna automaticamente al
                vender (sale de la OC vinculada). */}
            {condicion === "0KM" ? (
              <div className="md:col-span-2">
                <Label htmlFor="proveedorId">Proveedor (0KM)</Label>
                <select
                  id="proveedorId"
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                >
                  <option value="">— Sin proveedor asignado —</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  De quién compramos esta moto 0KM. El cliente comprador se
                  asigna automáticamente cuando se venda (vía Orden de Compra).
                </p>
              </div>
            ) : (
              <div className="md:col-span-2">
                <Label>Cliente que la entregó (dueño anterior)</Label>
                <ClienteSelector
                  clientes={clientes}
                  value={clienteEntregaId}
                  onChange={setClienteEntregaId}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cliente que entregó esta moto usada (dueño anterior, parte
                  de pago, consigna). El comprador nuevo se asigna
                  automáticamente cuando se venda.
                </p>
                {/* Fallback legacy: clienteNombre/clienteContacto importados
                    del Cardfile como texto libre. Mostrar para que Francisco
                    los vincule a un Cliente real al editar. */}
                {!clienteEntregaId && (clienteNombre || clienteContacto) && (
                  <div className="mt-3 rounded-md border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                      Datos legacy (texto libre) — vinculá un cliente arriba para reemplazarlos
                    </p>
                    {clienteNombre && (
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-mono text-[10px] uppercase text-gray-500 dark:text-gray-400">Nombre:</span> {clienteNombre}
                      </p>
                    )}
                    {clienteContacto && (
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-mono text-[10px] uppercase text-gray-500 dark:text-gray-400">Contacto:</span> {clienteContacto}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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

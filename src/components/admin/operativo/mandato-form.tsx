"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { ClienteSelector, type ClienteOption } from "./cliente-selector"
import { MultiImageUpload } from "@/components/admin/multi-image-upload"

export type MandatoData = {
  id?: string
  clienteId: string
  marca: string
  modelo: string
  anio: string
  kilometros: string
  cilindrada: string
  color: string
  chasis: string
  motor: string
  patente: string
  tieneTitulo: boolean
  tituloANombreCliente: boolean
  tienePrenda: boolean
  detallePrenda: string
  verificacionTecnica: boolean
  precioVenta: string
  precioMinimo: string
  comisionPorc: string
  comisionMonto: string
  moneda: string
  fechaFirma: string
  fechaVencimiento: string
  estado: string
  observaciones: string
  fotos: string[]
}

const EMPTY: MandatoData = {
  clienteId: "",
  marca: "",
  modelo: "",
  anio: String(new Date().getFullYear()),
  kilometros: "",
  cilindrada: "",
  color: "",
  chasis: "",
  motor: "",
  patente: "",
  tieneTitulo: true,
  tituloANombreCliente: true,
  tienePrenda: false,
  detallePrenda: "",
  verificacionTecnica: false,
  precioVenta: "",
  precioMinimo: "",
  comisionPorc: "10",
  comisionMonto: "",
  moneda: "ARS",
  fechaFirma: "",
  fechaVencimiento: "",
  estado: "PENDIENTE",
  observaciones: "",
  fotos: [],
}

export function MandatoForm({
  initialData,
  clientes,
  saveAction,
}: {
  initialData?: Partial<MandatoData> & { id?: string }
  clientes: ClienteOption[]
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<MandatoData>({ ...EMPTY, ...initialData })
  const [error, setError] = useState("")

  const set = <K extends keyof MandatoData>(key: K, value: MandatoData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.clienteId) {
      setError("Tenés que seleccionar un cliente")
      return
    }
    if (!data.marca.trim() || !data.modelo.trim()) {
      setError("Marca y modelo son obligatorios")
      return
    }
    if (!data.precioVenta || parseInt(data.precioVenta) <= 0) {
      setError("Precio de venta es obligatorio")
      return
    }

    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    Object.entries(data).forEach(([k, v]) => {
      if (k === "fotos") {
        formData.append("fotos", JSON.stringify(data.fotos))
      } else {
        formData.append(k, String(v ?? ""))
      }
    })

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        if (result?.id) {
          router.push(`/admin/mandatos/${result.id}`)
        } else {
          router.push("/admin/mandatos")
        }
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/mandatos" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar mandato" : "Nuevo mandato de venta"}
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
        {/* Cliente */}
        <Card className="lg:col-span-3 overflow-visible">
          <CardHeader>
            <CardTitle>Cliente (dueño de la moto) *</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <ClienteSelector
              clientes={clientes}
              value={data.clienteId}
              onChange={(id) => set("clienteId", id)}
            />
          </CardContent>
        </Card>

        {/* Datos de la moto */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos de la moto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="marca">Marca *</Label>
                <Input
                  id="marca"
                  value={data.marca}
                  onChange={(e) => set("marca", e.target.value)}
                  placeholder="Honda, Yamaha, etc."
                  required
                />
              </div>
              <div>
                <Label htmlFor="modelo">Modelo *</Label>
                <Input
                  id="modelo"
                  value={data.modelo}
                  onChange={(e) => set("modelo", e.target.value)}
                  placeholder="XR 150L"
                  required
                />
              </div>
              <div>
                <Label htmlFor="anio">Año</Label>
                <Input
                  id="anio"
                  type="number"
                  value={data.anio}
                  onChange={(e) => set("anio", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="kilometros">Kilómetros</Label>
                <Input
                  id="kilometros"
                  type="number"
                  value={data.kilometros}
                  onChange={(e) => set("kilometros", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cilindrada">Cilindrada</Label>
                <Input
                  id="cilindrada"
                  value={data.cilindrada}
                  onChange={(e) => set("cilindrada", e.target.value)}
                  placeholder="150cc"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={data.color}
                  onChange={(e) => set("color", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="chasis">Número de chasis</Label>
                <Input
                  id="chasis"
                  value={data.chasis}
                  onChange={(e) => set("chasis", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="motor">Número de motor</Label>
                <Input
                  id="motor"
                  value={data.motor}
                  onChange={(e) => set("motor", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="patente">Patente</Label>
                <Input
                  id="patente"
                  value={data.patente}
                  onChange={(e) => set("patente", e.target.value.toUpperCase())}
                  placeholder="AA123BB"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Económico */}
        <Card>
          <CardHeader>
            <CardTitle>Económico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="precioVenta">Precio de venta *</Label>
              <Input
                id="precioVenta"
                type="number"
                value={data.precioVenta}
                onChange={(e) => set("precioVenta", e.target.value)}
                placeholder="5000000"
                required
              />
            </div>
            <div>
              <Label htmlFor="precioMinimo">Precio mínimo aceptado</Label>
              <Input
                id="precioMinimo"
                type="number"
                value={data.precioMinimo}
                onChange={(e) => set("precioMinimo", e.target.value)}
                placeholder="4800000"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="comisionPorc">Comisión %</Label>
                <Input
                  id="comisionPorc"
                  type="number"
                  step="0.5"
                  value={data.comisionPorc}
                  onChange={(e) => set("comisionPorc", e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="moneda">Moneda</Label>
                <select
                  id="moneda"
                  value={data.moneda}
                  onChange={(e) => set("moneda", e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentación */}
        <Card>
          <CardHeader>
            <CardTitle>Documentación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tiene título</Label>
              <Switch
                checked={data.tieneTitulo}
                onCheckedChange={(v) => set("tieneTitulo", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Título a nombre del cliente</Label>
              <Switch
                checked={data.tituloANombreCliente}
                onCheckedChange={(v) => set("tituloANombreCliente", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tiene prenda</Label>
              <Switch
                checked={data.tienePrenda}
                onCheckedChange={(v) => set("tienePrenda", v)}
              />
            </div>
            {data.tienePrenda && (
              <div>
                <Label htmlFor="detallePrenda">Detalle prenda</Label>
                <Input
                  id="detallePrenda"
                  value={data.detallePrenda}
                  onChange={(e) => set("detallePrenda", e.target.value)}
                  placeholder="Entidad, cuotas restantes..."
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-sm">VTV vigente</Label>
              <Switch
                checked={data.verificacionTecnica}
                onCheckedChange={(v) => set("verificacionTecnica", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fechas y estado */}
        <Card>
          <CardHeader>
            <CardTitle>Fechas y estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={data.estado}
                onChange={(e) => set("estado", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="ACTIVO">Activo</option>
                <option value="VENDIDO">Vendido</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="VENCIDO">Vencido</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fechaFirma">Fecha de firma</Label>
              <Input
                id="fechaFirma"
                type="date"
                value={data.fechaFirma}
                onChange={(e) => set("fechaFirma", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fechaVencimiento">Vencimiento</Label>
              <Input
                id="fechaVencimiento"
                type="date"
                value={data.fechaVencimiento}
                onChange={(e) => set("fechaVencimiento", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Observaciones internas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              placeholder="Detalles adicionales sobre la moto, condiciones del mandato, etc."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Fotos */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Fotos de la moto</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cuando publiques al catálogo, estas fotos se pasan automáticamente.
              Si no subís ninguna, se usa el logo como placeholder.
            </p>
          </CardHeader>
          <CardContent>
            <MultiImageUpload
              value={data.fotos}
              onChange={(fotos) => set("fotos", fotos)}
              folder="motos-fernandez/mandatos"
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

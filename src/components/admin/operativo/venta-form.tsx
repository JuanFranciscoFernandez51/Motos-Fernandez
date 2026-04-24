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
import { ClienteSelector, type ClienteOption } from "./cliente-selector"
import { MotoSelector, type ModeloOption } from "./moto-selector"

export type VentaData = {
  id?: string
  clienteId: string
  modeloId: string
  motoDescripcion: string
  motoChasis: string
  motoMotor: string
  motoPatente: string
  motoAnio: string
  motoKilometros: string
  precioVenta: string
  moneda: string
  formaPago: string
  sena: string
  saldo: string
  detallePago: string
  permutaDescripcion: string
  permutaValor: string
  cuotas: string
  valorCuota: string
  entrega: string
  fecha: string
  estado: string
  observaciones: string
}

const EMPTY: VentaData = {
  clienteId: "",
  modeloId: "",
  motoDescripcion: "",
  motoChasis: "",
  motoMotor: "",
  motoPatente: "",
  motoAnio: "",
  motoKilometros: "",
  precioVenta: "",
  moneda: "ARS",
  formaPago: "Contado",
  sena: "",
  saldo: "",
  detallePago: "",
  permutaDescripcion: "",
  permutaValor: "",
  cuotas: "",
  valorCuota: "",
  entrega: "",
  fecha: new Date().toISOString().split("T")[0],
  estado: "BORRADOR",
  observaciones: "",
}

export function VentaForm({
  initialData,
  clientes,
  modelos,
  saveAction,
}: {
  initialData?: Partial<VentaData> & { id?: string }
  clientes: ClienteOption[]
  modelos: ModeloOption[]
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<VentaData>({ ...EMPTY, ...initialData })
  const [error, setError] = useState("")

  const set = <K extends keyof VentaData>(key: K, value: VentaData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  // Al elegir moto, auto-completar datos
  const onPickMoto = (m: ModeloOption) => {
    setData((prev) => ({
      ...prev,
      modeloId: m.id,
      motoDescripcion: m.nombre,
      motoChasis: m.chasis || prev.motoChasis,
      motoMotor: m.motor || prev.motoMotor,
      motoPatente: m.patente || prev.motoPatente,
      motoAnio: m.anio ? String(m.anio) : prev.motoAnio,
      motoKilometros: m.kilometros != null ? String(m.kilometros) : prev.motoKilometros,
      precioVenta: m.precio ? String(m.precio) : prev.precioVenta,
      moneda: m.moneda,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.clienteId) {
      setError("Seleccioná un cliente")
      return
    }
    if (!data.motoDescripcion.trim()) {
      setError("Cargá los datos de la moto (o seleccioná una del catálogo)")
      return
    }
    if (!data.precioVenta) {
      setError("Precio de venta es obligatorio")
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
        if (result?.id) {
          // Si es nueva venta (no había id inicial) → agregar ?recien=1 para mostrar banner con PDF
          const esNueva = !initialData?.id
          router.push(
            `/admin/ventas/${result.id}${esNueva ? "?recien=1" : ""}`
          )
        } else {
          router.push("/admin/ventas")
        }
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/ventas" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {initialData?.id ? "Editar venta" : "Nueva venta"}
          </h1>
        </div>
        <Button type="submit" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 overflow-visible">
          <CardHeader>
            <CardTitle>Cliente comprador *</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <ClienteSelector
              clientes={clientes}
              value={data.clienteId}
              onChange={(id) => set("clienteId", id)}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-visible">
          <CardHeader>
            <CardTitle>Moto a vender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div>
              <Label>Elegí del catálogo (autocompleta datos)</Label>
              <MotoSelector
                modelos={modelos}
                value={data.modeloId}
                onChange={(id) => set("modeloId", id)}
                onPick={onPickMoto}
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-3">
                Confirmá/ajustá los datos para el contrato:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="motoDescripcion">Descripción *</Label>
                  <Input
                    id="motoDescripcion"
                    value={data.motoDescripcion}
                    onChange={(e) => set("motoDescripcion", e.target.value)}
                    placeholder="Ej: Honda XR150L 2025"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="motoAnio">Año</Label>
                  <Input id="motoAnio" type="number" value={data.motoAnio} onChange={(e) => set("motoAnio", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="motoKilometros">Km</Label>
                  <Input id="motoKilometros" type="number" value={data.motoKilometros} onChange={(e) => set("motoKilometros", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="motoChasis">Nº chasis</Label>
                  <Input id="motoChasis" value={data.motoChasis} onChange={(e) => set("motoChasis", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="motoMotor">Nº motor</Label>
                  <Input id="motoMotor" value={data.motoMotor} onChange={(e) => set("motoMotor", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="motoPatente">Patente</Label>
                  <Input id="motoPatente" value={data.motoPatente} onChange={(e) => set("motoPatente", e.target.value.toUpperCase())} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Económico */}
        <Card>
          <CardHeader>
            <CardTitle>Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="precioVenta">Precio de venta *</Label>
              <Input id="precioVenta" type="number" value={data.precioVenta} onChange={(e) => set("precioVenta", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="formaPago">Forma de pago</Label>
              <select
                id="formaPago"
                value={data.formaPago}
                onChange={(e) => set("formaPago", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="Contado">Contado</option>
                <option value="Financiado">Financiado</option>
                <option value="Permuta">Permuta</option>
                <option value="Mixta">Mixta (varios)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sena">Seña entregada</Label>
              <Input id="sena" type="number" value={data.sena} onChange={(e) => set("sena", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="saldo">Saldo pendiente</Label>
              <Input id="saldo" type="number" value={data.saldo} onChange={(e) => set("saldo", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="moneda">Moneda</Label>
              <select
                id="moneda"
                value={data.moneda}
                onChange={(e) => set("moneda", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <Label htmlFor="detallePago">Detalle del pago</Label>
              <Textarea
                id="detallePago"
                value={data.detallePago}
                onChange={(e) => set("detallePago", e.target.value)}
                placeholder="Ej: Seña $500.000 efectivo, saldo al retirar. Pendiente transferencia."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {(data.formaPago === "Permuta" || data.formaPago === "Mixta") && (
          <Card>
            <CardHeader>
              <CardTitle>Permuta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="permutaDescripcion">Descripción</Label>
                <Textarea
                  id="permutaDescripcion"
                  value={data.permutaDescripcion}
                  onChange={(e) => set("permutaDescripcion", e.target.value)}
                  placeholder="Ej: Yamaha FZ 150 2020, 25.000km, patente ABC123"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="permutaValor">Valor tomado</Label>
                <Input
                  id="permutaValor"
                  type="number"
                  value={data.permutaValor}
                  onChange={(e) => set("permutaValor", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {(data.formaPago === "Financiado" || data.formaPago === "Mixta") && (
          <Card>
            <CardHeader>
              <CardTitle>Financiación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="entrega">Entrega</Label>
                <Input id="entrega" type="number" value={data.entrega} onChange={(e) => set("entrega", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cuotas">Cuotas</Label>
                  <Input id="cuotas" type="number" value={data.cuotas} onChange={(e) => set("cuotas", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="valorCuota">Valor cuota</Label>
                  <Input id="valorCuota" type="number" value={data.valorCuota} onChange={(e) => set("valorCuota", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Estado y fecha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={data.estado}
                onChange={(e) => set("estado", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="BORRADOR">Borrador</option>
                <option value="RESERVADA">Reservada (con seña)</option>
                <option value="CONCRETADA">Concretada (entregada)</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={data.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              placeholder="Cualquier nota adicional..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

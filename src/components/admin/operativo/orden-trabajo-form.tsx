"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react"
import { ClienteSelector, type ClienteOption } from "./cliente-selector"
import { MotoSelector, type ModeloOption } from "./moto-selector"
import { formatMoney } from "@/lib/admin-helpers"

export type OTItem = {
  descripcion: string
  tipo: "repuesto" | "mano_obra"
  cantidad: string
  precio: string
}

export type OTData = {
  id?: string
  clienteId: string
  modeloId: string
  motoMarca: string
  motoModelo: string
  motoAnio: string
  motoPatente: string
  motoKilometros: string
  tipoServicioId: string
  motivoIngreso: string
  diagnostico: string
  trabajosRealizados: string
  items: OTItem[]
  descuento: string
  pagado: string
  fechaPrometida: string
  estado: string
  observaciones: string
}

const EMPTY: OTData = {
  clienteId: "",
  modeloId: "",
  motoMarca: "",
  motoModelo: "",
  motoAnio: "",
  motoPatente: "",
  motoKilometros: "",
  tipoServicioId: "",
  motivoIngreso: "",
  diagnostico: "",
  trabajosRealizados: "",
  items: [],
  descuento: "",
  pagado: "",
  fechaPrometida: "",
  estado: "INGRESADA",
  observaciones: "",
}

export function OrdenTrabajoForm({
  initialData,
  clientes,
  modelos,
  tiposServicio,
  saveAction,
}: {
  initialData?: Partial<OTData> & { id?: string }
  clientes: ClienteOption[]
  modelos: ModeloOption[]
  tiposServicio: { id: string; nombre: string; precioBase: number | null }[]
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<OTData>({ ...EMPTY, ...initialData, items: initialData?.items ?? [] })
  const [error, setError] = useState("")

  const set = <K extends keyof OTData>(key: K, value: OTData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  const totales = useMemo(() => {
    const subtotal = data.items.reduce((acc, item) => {
      const c = parseInt(item.cantidad) || 1
      const p = parseInt(item.precio) || 0
      return acc + c * p
    }, 0)
    const descuento = parseInt(data.descuento) || 0
    const total = Math.max(0, subtotal - descuento)
    const pagado = parseInt(data.pagado) || 0
    const saldo = total - pagado
    return { subtotal, descuento, total, pagado, saldo }
  }, [data.items, data.descuento, data.pagado])

  const agregarItem = (tipo: "repuesto" | "mano_obra") => {
    setData((prev) => ({
      ...prev,
      items: [...prev.items, { descripcion: "", tipo, cantidad: "1", precio: "" }],
    }))
  }

  const updateItem = (i: number, key: keyof OTItem, value: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)),
    }))
  }

  const removeItem = (i: number) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== i),
    }))
  }

  // Al elegir moto del catálogo, autocompletar marca/modelo/año/patente
  const onPickMoto = (m: ModeloOption) => {
    setData((prev) => ({
      ...prev,
      modeloId: m.id,
      motoMarca: m.marca,
      motoModelo: m.nombre.replace(m.marca, "").trim(),
      motoAnio: m.anio ? String(m.anio) : prev.motoAnio,
      motoPatente: m.patente || prev.motoPatente,
      motoKilometros: m.kilometros != null ? String(m.kilometros) : prev.motoKilometros,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.clienteId) return setError("Seleccioná un cliente")
    if (!data.motoMarca.trim() || !data.motoModelo.trim())
      return setError("Marca y modelo de la moto son obligatorios")
    if (!data.motivoIngreso.trim())
      return setError("Describí el motivo de ingreso")

    const formData = new FormData()
    if (initialData?.id) formData.append("id", initialData.id)
    Object.entries(data).forEach(([k, v]) => {
      if (k === "items") {
        formData.append("items", JSON.stringify(data.items))
      } else {
        formData.append(k, String(v ?? ""))
      }
    })
    formData.append("subtotal", String(totales.subtotal))
    formData.append("total", String(totales.total))
    formData.append("saldo", String(totales.saldo))

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) setError(result.error)
      else {
        if (result?.id) router.push(`/admin/taller/${result.id}`)
        else router.push("/admin/taller")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/taller" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {initialData?.id ? "Editar orden de trabajo" : "Nueva orden de trabajo"}
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
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Cliente *</CardTitle>
          </CardHeader>
          <CardContent>
            <ClienteSelector
              clientes={clientes}
              value={data.clienteId}
              onChange={(id) => set("clienteId", id)}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Moto que ingresa al taller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Moto del catálogo (si es una nuestra)</Label>
              <MotoSelector
                modelos={modelos}
                value={data.modeloId}
                onChange={(id) => set("modeloId", id)}
                onPick={onPickMoto}
              />
              <p className="text-xs text-gray-500 mt-1">
                Si la moto NO es del catálogo (cliente externo), dejá esto vacío y cargá los datos abajo.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label htmlFor="motoMarca">Marca *</Label>
                <Input id="motoMarca" value={data.motoMarca} onChange={(e) => set("motoMarca", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="motoModelo">Modelo *</Label>
                <Input id="motoModelo" value={data.motoModelo} onChange={(e) => set("motoModelo", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="motoAnio">Año</Label>
                <Input id="motoAnio" type="number" value={data.motoAnio} onChange={(e) => set("motoAnio", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="motoPatente">Patente</Label>
                <Input id="motoPatente" value={data.motoPatente} onChange={(e) => set("motoPatente", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label htmlFor="motoKilometros">Kilómetros</Label>
                <Input id="motoKilometros" type="number" value={data.motoKilometros} onChange={(e) => set("motoKilometros", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tipoServicioId">Tipo de servicio</Label>
              <select
                id="tipoServicioId"
                value={data.tipoServicioId}
                onChange={(e) => set("tipoServicioId", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="">— Sin clasificar —</option>
                {tiposServicio.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <Link href="/admin/taller/tipos-servicio" className="text-xs text-[#6B4F7A] hover:underline mt-1 inline-block">
                + Gestionar tipos de servicio
              </Link>
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={data.estado}
                onChange={(e) => set("estado", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
              >
                <option value="INGRESADA">Ingresada</option>
                <option value="EN_DIAGNOSTICO">En diagnóstico</option>
                <option value="PRESUPUESTADA">Presupuestada</option>
                <option value="APROBADA">Aprobada</option>
                <option value="EN_REPARACION">En reparación</option>
                <option value="LISTA">Lista</option>
                <option value="ENTREGADA">Entregada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fechaPrometida">Fecha prometida</Label>
              <Input id="fechaPrometida" type="date" value={data.fechaPrometida} onChange={(e) => set("fechaPrometida", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Diagnóstico y trabajo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="motivoIngreso">Motivo de ingreso (lo que dice el cliente) *</Label>
              <Textarea
                id="motivoIngreso"
                value={data.motivoIngreso}
                onChange={(e) => set("motivoIngreso", e.target.value)}
                placeholder="Ej: 'No arranca en frío, hace un ruido raro en el motor'"
                rows={2}
                required
              />
            </div>
            <div>
              <Label htmlFor="diagnostico">Diagnóstico del mecánico</Label>
              <Textarea
                id="diagnostico"
                value={data.diagnostico}
                onChange={(e) => set("diagnostico", e.target.value)}
                placeholder="Observaciones técnicas, qué se detectó"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="trabajosRealizados">Trabajos realizados</Label>
              <Textarea
                id="trabajosRealizados"
                value={data.trabajosRealizados}
                onChange={(e) => set("trabajosRealizados", e.target.value)}
                placeholder="Descripción de lo que se hizo (se completa al terminar la OT)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Repuestos y mano de obra</CardTitle>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => agregarItem("repuesto")}>
                  <Plus className="size-3 mr-1" /> Repuesto
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => agregarItem("mano_obra")}>
                  <Plus className="size-3 mr-1" /> Mano de obra
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Agregá repuestos y mano de obra con los botones de arriba
              </p>
            ) : (
              <div className="space-y-2">
                {data.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-2">
                      <Label className="text-xs">Tipo</Label>
                      <select
                        value={item.tipo}
                        onChange={(e) => updateItem(i, "tipo", e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"
                      >
                        <option value="repuesto">Repuesto</option>
                        <option value="mano_obra">Mano de obra</option>
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={item.descripcion}
                        onChange={(e) => updateItem(i, "descripcion", e.target.value)}
                        placeholder={item.tipo === "repuesto" ? "Ej: Filtro aceite Honda" : "Ej: Cambio de aceite"}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => updateItem(i, "cantidad", e.target.value)}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <Label className="text-xs">Precio unitario</Label>
                      <Input
                        type="number"
                        value={item.precio}
                        onChange={(e) => updateItem(i, "precio", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-600 hover:bg-red-50 w-full">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatMoney(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Descuento:</span>
                  <Input
                    type="number"
                    value={data.descuento}
                    onChange={(e) => set("descuento", e.target.value)}
                    className="w-32 h-8 text-right"
                  />
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-[#6B4F7A]">{formatMoney(totales.total)}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pagado:</span>
                  <Input
                    type="number"
                    value={data.pagado}
                    onChange={(e) => set("pagado", e.target.value)}
                    className="w-32 h-8 text-right"
                  />
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-600">Saldo pendiente:</span>
                  <span className={totales.saldo > 0 ? "text-orange-600" : "text-green-600"}>
                    {formatMoney(totales.saldo)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Observaciones internas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

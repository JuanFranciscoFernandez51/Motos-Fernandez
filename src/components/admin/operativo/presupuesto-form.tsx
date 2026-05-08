"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react"
import { ClienteSelector, type ClienteOption } from "./cliente-selector"

export type PresupuestoData = {
  id?: string
  clienteId: string
  clienteNombre: string
  clienteContacto: string
  motoMarca: string
  motoModelo: string
  motoAnio: string
  motoPatente: string
  motoKilometros: string
  motivoIngreso: string
  trabajosACotizar: string
  observaciones: string
  validezDias: string
  estado: string
  descuento: string
}

export type PresupuestoItem = {
  descripcion: string
  tipo: "repuesto" | "mano_obra"
  cantidad: string
  precio: string
}

const EMPTY: PresupuestoData = {
  clienteId: "",
  clienteNombre: "",
  clienteContacto: "",
  motoMarca: "",
  motoModelo: "",
  motoAnio: "",
  motoPatente: "",
  motoKilometros: "",
  motivoIngreso: "",
  trabajosACotizar: "",
  observaciones: "",
  validezDias: "15",
  estado: "BORRADOR",
  descuento: "0",
}

export function PresupuestoForm({
  initialData,
  initialItems = [],
  clientes,
  saveAction,
}: {
  initialData?: Partial<PresupuestoData> & { id?: string }
  initialItems?: PresupuestoItem[]
  clientes: ClienteOption[]
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<PresupuestoData>({ ...EMPTY, ...initialData })
  const [items, setItems] = useState<PresupuestoItem[]>(
    initialItems.length > 0
      ? initialItems
      : [{ descripcion: "", tipo: "repuesto", cantidad: "1", precio: "" }]
  )
  const [error, setError] = useState("")

  const set = <K extends keyof PresupuestoData>(k: K, v: PresupuestoData[K]) => {
    setData((p) => ({ ...p, [k]: v }))
  }

  // Subtotal y total derivados
  const subtotal = useMemo(
    () =>
      items.reduce((s, it) => {
        const cant = parseInt(it.cantidad) || 0
        const precio = parseInt(it.precio) || 0
        return s + cant * precio
      }, 0),
    [items]
  )
  const descuento = parseInt(data.descuento) || 0
  const total = Math.max(subtotal - descuento, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!data.clienteId && !data.clienteNombre.trim()) {
      setError("Seleccioná un cliente o cargá nombre/contacto en texto libre")
      return
    }
    if (items.filter((i) => i.descripcion.trim()).length === 0) {
      setError("Agregá al menos un ítem")
      return
    }

    const fd = new FormData()
    if (initialData?.id) fd.append("id", initialData.id)
    Object.entries(data).forEach(([k, v]) => fd.append(k, String(v ?? "")))
    fd.append("items", JSON.stringify(items.filter((i) => i.descripcion.trim())))
    fd.append("subtotal", String(subtotal))
    fd.append("total", String(total))

    startTransition(async () => {
      const r = await saveAction(fd)
      if (r?.error) setError(r.error)
      else if (r?.id) {
        router.push(`/admin/presupuestos/${r.id}`)
        router.refresh()
      } else {
        router.push("/admin/presupuestos")
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/presupuestos" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{initialData?.id ? "Editar presupuesto" : "Nuevo presupuesto"}</h1>
        </div>
        <Button type="submit" className="bg-[#6B4F7A] hover:bg-[#8B6F9A]" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cliente */}
        <Card className="lg:col-span-2 overflow-visible">
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ClienteSelector clientes={clientes} value={data.clienteId} onChange={(id) => set("clienteId", id)} />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ¿No es cliente todavía? Cargalo abajo en texto libre y después lo creamos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cn">Nombre (texto libre)</Label>
                <Input id="cn" value={data.clienteNombre} onChange={(e) => set("clienteNombre", e.target.value)} placeholder="Solo si NO está en la base" />
              </div>
              <div>
                <Label htmlFor="cc">Contacto (tel/email)</Label>
                <Input id="cc" value={data.clienteContacto} onChange={(e) => set("clienteContacto", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validez y estado */}
        <Card>
          <CardHeader>
            <CardTitle>Vigencia y estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="validez">Validez (días)</Label>
              <Input id="validez" type="number" value={data.validezDias} onChange={(e) => set("validezDias", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={data.estado}
                onChange={(e) => set("estado", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm bg-white dark:bg-neutral-900"
              >
                <option value="BORRADOR">Borrador</option>
                <option value="ENVIADO">Enviado</option>
                <option value="ACEPTADO">Aceptado</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="VENCIDO">Vencido</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Moto */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Vehículo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <Label>Marca</Label>
                <Input value={data.motoMarca} onChange={(e) => set("motoMarca", e.target.value)} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={data.motoModelo} onChange={(e) => set("motoModelo", e.target.value)} />
              </div>
              <div>
                <Label>Año</Label>
                <Input type="number" value={data.motoAnio} onChange={(e) => set("motoAnio", e.target.value)} />
              </div>
              <div>
                <Label>Patente</Label>
                <Input value={data.motoPatente} onChange={(e) => set("motoPatente", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label>Km</Label>
                <Input type="number" value={data.motoKilometros} onChange={(e) => set("motoKilometros", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalle del trabajo */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Detalle del trabajo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Motivo / pedido del cliente</Label>
              <Textarea value={data.motivoIngreso} onChange={(e) => set("motivoIngreso", e.target.value)} rows={2} placeholder="Ej: hace ruido el motor, no arranca en frío, service de 5000km..." />
            </div>
            <div>
              <Label>Trabajos a realizar (descripción detallada)</Label>
              <Textarea value={data.trabajosACotizar} onChange={(e) => set("trabajosACotizar", e.target.value)} rows={4} placeholder="Ej: Cambio de aceite y filtro, regulación de válvulas, ajuste de frenos..." />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Items y precios</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((p) => [...p, { descripcion: "", tipo: "repuesto", cantidad: "1", precio: "" }])
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase">Tipo</Label>
                  <select
                    value={it.tipo}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x, idx) => (idx === i ? { ...x, tipo: e.target.value as "repuesto" | "mano_obra" } : x))
                      )
                    }
                    className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 px-2 text-xs bg-white dark:bg-neutral-900"
                  >
                    <option value="repuesto">Repuesto</option>
                    <option value="mano_obra">Mano de obra</option>
                  </select>
                </div>
                <div className="col-span-5">
                  <Label className="text-[10px] uppercase">Descripción</Label>
                  <Input
                    value={it.descripcion}
                    onChange={(e) =>
                      setItems((p) => p.map((x, idx) => (idx === i ? { ...x, descripcion: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-[10px] uppercase">Cant.</Label>
                  <Input
                    type="number"
                    value={it.cantidad}
                    onChange={(e) =>
                      setItems((p) => p.map((x, idx) => (idx === i ? { ...x, cantidad: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase">Precio</Label>
                  <Input
                    type="number"
                    value={it.precio}
                    onChange={(e) =>
                      setItems((p) => p.map((x, idx) => (idx === i ? { ...x, precio: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="col-span-1 text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subt.</p>
                  <p className="text-sm font-mono">
                    ${((parseInt(it.cantidad) || 0) * (parseInt(it.precio) || 0)).toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="col-span-1 text-right">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Totales */}
        <Card className="lg:col-span-3">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-end items-center gap-3">
              <Label htmlFor="desc">Descuento</Label>
              <Input
                id="desc"
                type="number"
                value={data.descuento}
                onChange={(e) => set("descuento", e.target.value)}
                className="w-32 text-right"
              />
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="font-mono">${subtotal.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Descuento</span>
              <span className="font-mono">- ${descuento.toLocaleString("es-AR")}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-lg font-bold text-[#6B4F7A] font-mono">
                ${total.toLocaleString("es-AR")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card className="lg:col-span-3">
          <CardContent className="p-5">
            <Label>Observaciones</Label>
            <Textarea
              value={data.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
              rows={3}
              placeholder="Información adicional para el cliente o notas internas..."
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

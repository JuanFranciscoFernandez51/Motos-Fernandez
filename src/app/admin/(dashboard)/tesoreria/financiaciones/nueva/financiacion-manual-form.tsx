"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import {
  ClienteSelector,
  type ClienteOption,
} from "@/components/admin/operativo/cliente-selector"
import { formatMoney } from "@/lib/admin-helpers"

export function FinanciacionManualForm({
  clientes,
  saveAction,
}: {
  clientes: ClienteOption[]
  saveAction: (data: FormData) => Promise<{ error?: string } | void>
}) {
  const [clienteId, setClienteId] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [moneda, setMoneda] = useState("ARS")
  const [entrega, setEntrega] = useState("")
  const [cantidadCuotas, setCantidadCuotas] = useState("")
  const [valorCuota, setValorCuota] = useState("")
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0])
  const [diaVencimiento, setDiaVencimiento] = useState("10")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const cuotasNum = parseInt(cantidadCuotas) || 0
  const valorNum = parseInt(valorCuota) || 0
  const total = cuotasNum * valorNum

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!clienteId) {
      setError("Seleccioná un cliente")
      return
    }
    if (cuotasNum <= 0 || valorNum <= 0) {
      setError("Cantidad de cuotas y valor son obligatorios")
      return
    }

    const formData = new FormData()
    formData.append("clienteId", clienteId)
    formData.append("descripcion", descripcion)
    formData.append("moneda", moneda)
    formData.append("entrega", entrega || "0")
    formData.append("cantidadCuotas", cantidadCuotas)
    formData.append("valorCuota", valorCuota)
    formData.append("fechaInicio", fechaInicio)
    formData.append("diaVencimiento", diaVencimiento)
    formData.append("observaciones", observaciones)

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/admin/tesoreria/financiaciones" />}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Nueva financiación manual
        </h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Cargá una financiación que no proviene de una OC (por ejemplo, deudas viejas o
        acuerdos sin boleto).
      </p>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 overflow-visible">
          <CardHeader>
            <CardTitle>Cliente *</CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <ClienteSelector
              clientes={clientes}
              value={clienteId}
              onChange={setClienteId}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos del plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="descripcion">Descripción / concepto</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Honda XR150L 2024 — saldo financiado"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="moneda">Moneda</Label>
                <select
                  id="moneda"
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <Label htmlFor="entrega">Entrega</Label>
                <Input
                  id="entrega"
                  type="number"
                  value={entrega}
                  onChange={(e) => setEntrega(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="diaVencimiento">Día venc.</Label>
                <Input
                  id="diaVencimiento"
                  type="number"
                  min="1"
                  max="28"
                  value={diaVencimiento}
                  onChange={(e) => setDiaVencimiento(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cantidadCuotas">Cantidad de cuotas *</Label>
                <Input
                  id="cantidadCuotas"
                  type="number"
                  min="1"
                  value={cantidadCuotas}
                  onChange={(e) => setCantidadCuotas(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="valorCuota">Valor por cuota *</Label>
                <Input
                  id="valorCuota"
                  type="number"
                  value={valorCuota}
                  onChange={(e) => setValorCuota(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="fechaInicio">Fecha de inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#6B4F7A]/10 to-[#8B6F9A]/5 border-[#6B4F7A]/30">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Cuotas:</span>
              <span className="font-semibold">{cuotasNum || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Valor cuota:</span>
              <span className="font-semibold">
                {valorNum > 0 ? formatMoney(valorNum, moneda) : "—"}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-700 dark:text-gray-300 font-semibold">Total:</span>
              <span className="text-xl font-bold text-[#6B4F7A]">
                {total > 0 ? formatMoney(total, moneda) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
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
          Crear financiación
        </Button>
      </div>
    </form>
  )
}

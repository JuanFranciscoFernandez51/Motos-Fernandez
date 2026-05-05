"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2, ShoppingCart, Zap, Receipt } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ClienteSelector, type ClienteOption } from "./cliente-selector"

export type ModeloAVender = {
  id: string
  nombre: string
  marca: string
  anio: number | null
  kilometros: number | null
  precio: number | null
  moneda: string
  fotos: string[]
  patente: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  modelo: ModeloAVender | null
  clientes: ClienteOption[]
  // Server actions
  markVendida: (id: string, vendida: boolean) => Promise<void>
  crearOCDesdeModelo: (input: CrearOCInput) => Promise<{
    error?: string
    ordenId?: string
    motoRecibidaId?: string | null
  }>
}

type CrearOCInput = {
  modeloId: string
  clienteId: string
  precioVenta: number
  moneda: string
  formaPago: string
  sena: number | null
  saldo: number | null
  detallePago: string | null
  estado: "BORRADOR" | "RESERVADA" | "CONCRETADA"
  observaciones: string | null
  permutaDescripcion: string | null
  permutaValor: number | null
  subirPermutaAStock: boolean
  permutaMarca: string | null
  permutaModelo: string | null
  permutaAnio: number | null
  permutaKm: number | null
  permutaPatente: string | null
  permutaChasis: string | null
  permutaMotor: string | null
  cuotas: number | null
  valorCuota: number | null
  entrega: number | null
}

export function OCDrawer({
  open,
  onClose,
  modelo,
  clientes,
  markVendida,
  crearOCDesdeModelo,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  // Modo: rápido (solo marcar vendida) o completo (generar OC)
  const [modoRapido, setModoRapido] = useState(false)

  // Cliente
  const [clienteId, setClienteId] = useState("")

  // Económico
  const [precioVenta, setPrecioVenta] = useState("")
  const [formaPago, setFormaPago] = useState("Contado")
  const [sena, setSena] = useState("")
  const [saldo, setSaldo] = useState("")
  const [detallePago, setDetallePago] = useState("")

  // Permuta
  const [subirPermutaAStock, setSubirPermutaAStock] = useState(true)
  const [permutaMarca, setPermutaMarca] = useState("")
  const [permutaModelo, setPermutaModelo] = useState("")
  const [permutaAnio, setPermutaAnio] = useState("")
  const [permutaKm, setPermutaKm] = useState("")
  const [permutaPatente, setPermutaPatente] = useState("")
  const [permutaChasis, setPermutaChasis] = useState("")
  const [permutaMotor, setPermutaMotor] = useState("")
  const [permutaValor, setPermutaValor] = useState("")
  const [permutaDescripcion, setPermutaDescripcion] = useState("")

  // Financiación
  const [entrega, setEntrega] = useState("")
  const [cuotas, setCuotas] = useState("")
  const [valorCuota, setValorCuota] = useState("")

  // Estado y observaciones
  const [estado, setEstado] = useState<"BORRADOR" | "RESERVADA" | "CONCRETADA">("CONCRETADA")
  const [observaciones, setObservaciones] = useState("")

  // Reset al abrir/cerrar o cambiar de moto
  useEffect(() => {
    if (open && modelo) {
      setError("")
      setModoRapido(false)
      setClienteId("")
      setPrecioVenta(modelo.precio ? String(modelo.precio) : "")
      setFormaPago("Contado")
      setSena("")
      setSaldo("")
      setDetallePago("")
      setSubirPermutaAStock(true)
      setPermutaMarca("")
      setPermutaModelo("")
      setPermutaAnio("")
      setPermutaKm("")
      setPermutaPatente("")
      setPermutaChasis("")
      setPermutaMotor("")
      setPermutaValor("")
      setPermutaDescripcion("")
      setEntrega("")
      setCuotas("")
      setValorCuota("")
      setEstado("CONCRETADA")
      setObservaciones("")
    }
  }, [open, modelo])

  // Auto-calcular saldo
  useEffect(() => {
    const p = parseInt(precioVenta) || 0
    const s = parseInt(sena) || 0
    const v = parseInt(permutaValor) || 0
    const e = parseInt(entrega) || 0
    if (p > 0) {
      const saldoCalc = p - s - v - e
      setSaldo(saldoCalc > 0 ? String(saldoCalc) : "")
    }
  }, [precioVenta, sena, permutaValor, entrega])

  // Auto-sugerir estado según seña
  useEffect(() => {
    const s = parseInt(sena) || 0
    const p = parseInt(precioVenta) || 0
    if (s > 0 && s < p) {
      setEstado("RESERVADA")
    }
  }, [sena, precioVenta])

  if (!open || !modelo) return null

  const num = (s: string) => {
    const v = parseInt(s)
    return isNaN(v) ? null : v
  }

  // Modo rápido: solo marcar como vendida (comportamiento viejo)
  const handleModoRapido = () => {
    if (!modelo) return
    startTransition(async () => {
      await markVendida(modelo.id, true)
      onClose()
      router.refresh()
    })
  }

  // Modo completo: generar OC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!clienteId) {
      setError("Seleccioná un cliente")
      return
    }
    if (!precioVenta || num(precioVenta) === null) {
      setError("Precio de venta es obligatorio")
      return
    }

    const hayPermuta = formaPago === "Permuta" || formaPago === "Mixta"
    if (hayPermuta && subirPermutaAStock && (!permutaMarca.trim() || !permutaModelo.trim())) {
      setError("Para subir la moto recibida al stock, completá al menos marca y modelo")
      return
    }

    startTransition(async () => {
      const result = await crearOCDesdeModelo({
        modeloId: modelo.id,
        clienteId,
        precioVenta: num(precioVenta) ?? 0,
        moneda: modelo.moneda || "ARS",
        formaPago,
        sena: num(sena),
        saldo: num(saldo),
        detallePago: detallePago.trim() || null,
        estado,
        observaciones: observaciones.trim() || null,
        permutaDescripcion: hayPermuta ? (permutaDescripcion.trim() || null) : null,
        permutaValor: hayPermuta ? num(permutaValor) : null,
        subirPermutaAStock: hayPermuta && subirPermutaAStock,
        permutaMarca: hayPermuta ? (permutaMarca.trim() || null) : null,
        permutaModelo: hayPermuta ? (permutaModelo.trim() || null) : null,
        permutaAnio: hayPermuta ? num(permutaAnio) : null,
        permutaKm: hayPermuta ? num(permutaKm) : null,
        permutaPatente: hayPermuta ? (permutaPatente.trim().toUpperCase() || null) : null,
        permutaChasis: hayPermuta ? (permutaChasis.trim() || null) : null,
        permutaMotor: hayPermuta ? (permutaMotor.trim() || null) : null,
        cuotas: formaPago === "Financiado" || formaPago === "Mixta" ? num(cuotas) : null,
        valorCuota: formaPago === "Financiado" || formaPago === "Mixta" ? num(valorCuota) : null,
        entrega: formaPago === "Financiado" || formaPago === "Mixta" ? num(entrega) : null,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      onClose()
      // Redirigir al detalle de la OC con banner de PDF
      if (result?.ordenId) {
        router.push(`/admin/ordenes-compra/${result.ordenId}?recien=1`)
      } else {
        router.refresh()
      }
    })
  }

  const hayPermuta = formaPago === "Permuta" || formaPago === "Mixta"
  const hayFinanciacion = formaPago === "Financiado" || formaPago === "Mixta"
  const fotoMoto = modelo.fotos[0] || "/images/logo-clasico.png"

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full bg-white dark:bg-neutral-950 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <ShoppingCart className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Generar Orden de Compra
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Marcá la moto como vendida y registrá la operación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Moto preseleccionada */}
          <div className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 px-5 py-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoMoto}
                alt={modelo.nombre}
                className="size-16 rounded-md object-cover bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Moto a vender</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {modelo.marca} {modelo.nombre}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {[modelo.anio, modelo.kilometros ? `${modelo.kilometros.toLocaleString("es-AR")} km` : null, modelo.patente]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              {modelo.precio && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Precio listado</p>
                  <p className="font-bold text-[#6B4F7A]">
                    {modelo.moneda === "USD" ? "USD " : "$ "}
                    {modelo.precio.toLocaleString("es-AR")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Toggle modo rápido */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/20">
            <button
              type="button"
              onClick={() => setModoRapido(!modoRapido)}
              className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 hover:underline"
            >
              <Zap className="size-3" />
              {modoRapido
                ? "← Volver al flujo completo (con cliente y OC)"
                : "Modo rápido: solo marcar vendida (sin cargar cliente)"}
            </button>
          </div>

          {modoRapido ? (
            // ====== MODO RÁPIDO ======
            <div className="p-5 space-y-4">
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-4">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  ⚠️ Modo rápido
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-1">
                  La moto se marca como vendida y desaparece del catálogo público,
                  pero <strong>NO se crea una Orden de Compra</strong>. No queda
                  registro de cliente, precio, ni se genera PDF. Usalo solo si
                  vas a cargar la OC manualmente después o si solo querés sacarla del catálogo.
                </p>
              </div>
            </div>
          ) : (
            // ====== MODO COMPLETO ======
            <form onSubmit={handleSubmit} id="oc-form" className="p-5 space-y-5">
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                  {error}
                </div>
              )}

              {/* Cliente */}
              <section>
                <Label className="mb-2 block">Cliente comprador *</Label>
                <ClienteSelector
                  clientes={clientes}
                  value={clienteId}
                  onChange={setClienteId}
                />
              </section>

              {/* Económico */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-1">
                  Pago
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="precioVenta">Precio venta *</Label>
                    <Input
                      id="precioVenta"
                      type="number"
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="formaPago">Forma de pago</Label>
                    <select
                      id="formaPago"
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                    >
                      <option value="Contado">Contado</option>
                      <option value="Financiado">Financiado</option>
                      <option value="Permuta">Permuta</option>
                      <option value="Mixta">Mixta (varios)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="sena">Seña</Label>
                    <Input
                      id="sena"
                      type="number"
                      value={sena}
                      onChange={(e) => setSena(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="saldo">Saldo (auto)</Label>
                    <Input
                      id="saldo"
                      type="number"
                      value={saldo}
                      onChange={(e) => setSaldo(e.target.value)}
                      className="bg-gray-50 dark:bg-neutral-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="detallePago">Detalle del pago</Label>
                    <Textarea
                      id="detallePago"
                      value={detallePago}
                      onChange={(e) => setDetallePago(e.target.value)}
                      placeholder="Ej: Seña $500.000 efectivo, saldo al retirar."
                      rows={2}
                    />
                  </div>
                </div>
              </section>

              {/* Permuta */}
              {hayPermuta && (
                <section className="space-y-3 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    🔄 Parte de pago (moto que entrega el cliente)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="permutaMarca">Marca</Label>
                      <Input
                        id="permutaMarca"
                        value={permutaMarca}
                        onChange={(e) => setPermutaMarca(e.target.value)}
                        placeholder="Honda"
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaModelo">Modelo</Label>
                      <Input
                        id="permutaModelo"
                        value={permutaModelo}
                        onChange={(e) => setPermutaModelo(e.target.value)}
                        placeholder="Wave 110"
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaAnio">Año</Label>
                      <Input
                        id="permutaAnio"
                        type="number"
                        value={permutaAnio}
                        onChange={(e) => setPermutaAnio(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaKm">Km</Label>
                      <Input
                        id="permutaKm"
                        type="number"
                        value={permutaKm}
                        onChange={(e) => setPermutaKm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaPatente">Patente</Label>
                      <Input
                        id="permutaPatente"
                        value={permutaPatente}
                        onChange={(e) => setPermutaPatente(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaValor">Valor tomado *</Label>
                      <Input
                        id="permutaValor"
                        type="number"
                        value={permutaValor}
                        onChange={(e) => setPermutaValor(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaChasis">Nº chasis</Label>
                      <Input
                        id="permutaChasis"
                        value={permutaChasis}
                        onChange={(e) => setPermutaChasis(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="permutaMotor">Nº motor</Label>
                      <Input
                        id="permutaMotor"
                        value={permutaMotor}
                        onChange={(e) => setPermutaMotor(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="permutaDescripcion">Notas/descripción</Label>
                      <Textarea
                        id="permutaDescripcion"
                        value={permutaDescripcion}
                        onChange={(e) => setPermutaDescripcion(e.target.value)}
                        placeholder="Estado general, detalles, observaciones..."
                        rows={2}
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer rounded-md bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-900/40 p-3">
                    <input
                      type="checkbox"
                      checked={subirPermutaAStock}
                      onChange={(e) => setSubirPermutaAStock(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Subir esta moto al stock como usada
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Crea automáticamente un nuevo modelo (inactivo, con foto del logo) en
                        el catálogo. Después subís fotos reales y la activás manualmente.
                      </p>
                    </div>
                  </label>
                </section>
              )}

              {/* Financiación */}
              {hayFinanciacion && (
                <section className="space-y-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    💳 Financiación
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="entrega">Entrega</Label>
                      <Input
                        id="entrega"
                        type="number"
                        value={entrega}
                        onChange={(e) => setEntrega(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cuotas">Cuotas</Label>
                      <Input
                        id="cuotas"
                        type="number"
                        value={cuotas}
                        onChange={(e) => setCuotas(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="valorCuota">Valor cuota</Label>
                      <Input
                        id="valorCuota"
                        type="number"
                        value={valorCuota}
                        onChange={(e) => setValorCuota(e.target.value)}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Estado y observaciones */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-1">
                  Estado de la operación
                </h3>
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    value={estado}
                    onChange={(e) =>
                      setEstado(e.target.value as "BORRADOR" | "RESERVADA" | "CONCRETADA")
                    }
                    className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
                  >
                    <option value="BORRADOR">Borrador (no afecta el catálogo)</option>
                    <option value="RESERVADA">Reservada (etiqueta en catálogo)</option>
                    <option value="CONCRETADA">Concretada (saca del catálogo)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                  />
                </div>
              </section>
            </form>
          )}
        </div>

        {/* Footer fijo */}
        <div className="border-t border-gray-200 dark:border-neutral-800 px-5 py-3 bg-gray-50 dark:bg-neutral-900 shrink-0 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50"
          >
            Cancelar
          </button>
          {modoRapido ? (
            <button
              type="button"
              onClick={handleModoRapido}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Marcar vendida
            </button>
          ) : (
            <button
              type="submit"
              form="oc-form"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Receipt className="size-4" />
              )}
              Generar OC
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

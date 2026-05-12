"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2, ShoppingCart, Zap, Receipt } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ClienteSelector, type ClienteOption } from "./cliente-selector"
import { PagosEditor, pagoVacio, type PagoForm } from "./pagos-editor"

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

// Una permuta dentro de la OC. La OC puede tener N permutas.
export type PermutaInput = {
  marca: string | null
  modelo: string | null
  anio: number | null
  kilometros: number | null
  patente: string | null
  chasis: string | null
  motor: string | null
  descripcion: string | null
  valor: number | null
  moneda?: string
  subirAlStock: boolean
  // Checklist de accesorios que entrega
  tieneTitulo?: boolean
  tieneManual?: boolean
  tieneSegundaLlave?: boolean
  tieneCasco?: boolean
  tieneVtv?: boolean
  tieneSeguro?: boolean
  tieneFactura?: boolean
  tieneFichaTecnica?: boolean
  accesoriosExtra?: string | null
}

// Un pago directo (efectivo, transfer, tarjeta, etc). La OC puede tener N pagos.
export type PagoInput = {
  metodo: string
  monto: number
  moneda?: string
  detalle: string | null
  fecha: string | null  // ISO YYYY-MM-DD o null
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
  // Permutas (N): si formaPago incluye permuta. Vacio si no aplica.
  permutas: PermutaInput[]
  // Pagos directos (N): efectivo, transfer, tarjeta, etc — combinables.
  pagos: PagoInput[]
  // Financiación
  cuotas: number | null
  valorCuota: number | null
  entrega: number | null
  // Garante (opcional, solo aplica si hay financiación)
  garanteNombre: string | null
  garanteApellido: string | null
  garanteDni: string | null
  garanteTelefono: string | null
  garanteDireccion: string | null
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

  // Permutas (array). Cada item es un parte de pago. Usar string para inputs;
  // se parsea a number al enviar.
  type PermutaForm = {
    marca: string
    modelo: string
    anio: string
    km: string
    patente: string
    chasis: string
    motor: string
    valor: string
    moneda: string
    descripcion: string
    subirAlStock: boolean
    tieneTitulo: boolean
    tieneManual: boolean
    tieneSegundaLlave: boolean
    tieneCasco: boolean
    tieneVtv: boolean
    tieneSeguro: boolean
    tieneFactura: boolean
    tieneFichaTecnica: boolean
    accesoriosExtra: string
  }
  const monedaModelo = modelo?.moneda || "ARS"
  const permutaVacia = (mon: string = monedaModelo): PermutaForm => ({
    marca: "", modelo: "", anio: "", km: "", patente: "",
    chasis: "", motor: "", valor: "", moneda: mon, descripcion: "", subirAlStock: true,
    tieneTitulo: false, tieneManual: false, tieneSegundaLlave: false,
    tieneCasco: false, tieneVtv: false, tieneSeguro: false,
    tieneFactura: false, tieneFichaTecnica: false, accesoriosExtra: "",
  })
  const [permutas, setPermutas] = useState<PermutaForm[]>([permutaVacia()])
  const [pagos, setPagos] = useState<PagoForm[]>([pagoVacio(monedaModelo)])

  // Financiación
  const [entrega, setEntrega] = useState("")
  const [cuotas, setCuotas] = useState("")
  const [valorCuota, setValorCuota] = useState("")

  // Garante (opcional, solo se muestra si hay financiación)
  const [garanteNombre, setGaranteNombre] = useState("")
  const [garanteApellido, setGaranteApellido] = useState("")
  const [garanteDni, setGaranteDni] = useState("")
  const [garanteTelefono, setGaranteTelefono] = useState("")
  const [garanteDireccion, setGaranteDireccion] = useState("")

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
      setPermutas([permutaVacia(modelo?.moneda || "ARS")])
      setPagos([pagoVacio(modelo?.moneda || "ARS")])
      setEntrega("")
      setCuotas("")
      setValorCuota("")
      setGaranteNombre("")
      setGaranteApellido("")
      setGaranteDni("")
      setGaranteTelefono("")
      setGaranteDireccion("")
      setEstado("CONCRETADA")
      setObservaciones("")
    }
  }, [open, modelo])

  // Suma de permutas válidas (con valor > 0)
  const totalPermutas = permutas.reduce((sum, pp) => sum + (parseInt(pp.valor) || 0), 0)

  // Auto-calcular saldo
  useEffect(() => {
    const p = parseInt(precioVenta) || 0
    const s = parseInt(sena) || 0
    const v = totalPermutas
    const e = parseInt(entrega) || 0
    if (p > 0) {
      const saldoCalc = p - s - v - e
      setSaldo(saldoCalc > 0 ? String(saldoCalc) : "")
    }
  }, [precioVenta, sena, totalPermutas, entrega])

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

    // Filtrar permutas validas (al menos algun dato cargado o valor > 0)
    const permutasFiltradas = hayPermuta
      ? permutas
          .filter((pp) => pp.marca.trim() || pp.modelo.trim() || pp.valor.trim())
          .map((pp) => ({
            marca: pp.marca.trim() || null,
            modelo: pp.modelo.trim() || null,
            anio: num(pp.anio),
            kilometros: num(pp.km),
            patente: pp.patente.trim().toUpperCase() || null,
            chasis: pp.chasis.trim() || null,
            motor: pp.motor.trim() || null,
            descripcion: pp.descripcion.trim() || null,
            valor: num(pp.valor),
            moneda: pp.moneda || monedaModelo,
            subirAlStock: pp.subirAlStock,
            tieneTitulo: pp.tieneTitulo,
            tieneManual: pp.tieneManual,
            tieneSegundaLlave: pp.tieneSegundaLlave,
            tieneCasco: pp.tieneCasco,
            tieneVtv: pp.tieneVtv,
            tieneSeguro: pp.tieneSeguro,
            tieneFactura: pp.tieneFactura,
            tieneFichaTecnica: pp.tieneFichaTecnica,
            accesoriosExtra: pp.accesoriosExtra.trim() || null,
          }))
      : []

    if (hayPermuta && permutasFiltradas.length === 0) {
      setError("Cargá al menos una permuta o cambiá la forma de pago")
      return
    }
    // Si alguna se sube al stock, debe tener marca y modelo
    const incompleta = permutasFiltradas.find(
      (pp) => pp.subirAlStock && (!pp.marca || !pp.modelo)
    )
    if (incompleta) {
      setError("Para subir una moto al stock, completá al menos marca y modelo")
      return
    }

    const hayFin = formaPago === "Financiado" || formaPago === "Mixta"

    // Pagos directos: filtrar los renglones con monto válido > 0
    const pagosFiltrados: PagoInput[] = pagos
      .filter((p) => {
        const n = parseInt(p.monto || "0")
        return Number.isFinite(n) && n > 0
      })
      .map((p) => ({
        metodo: p.metodo,
        monto: parseInt(p.monto),
        moneda: p.moneda || monedaModelo,
        detalle: p.detalle.trim() || null,
        fecha: p.fecha || null,
      }))

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
        permutas: permutasFiltradas,
        pagos: pagosFiltrados,
        cuotas: hayFin ? num(cuotas) : null,
        valorCuota: hayFin ? num(valorCuota) : null,
        entrega: hayFin ? num(entrega) : null,
        garanteNombre: hayFin ? (garanteNombre.trim() || null) : null,
        garanteApellido: hayFin ? (garanteApellido.trim() || null) : null,
        garanteDni: hayFin ? (garanteDni.trim() || null) : null,
        garanteTelefono: hayFin ? (garanteTelefono.trim() || null) : null,
        garanteDireccion: hayFin ? (garanteDireccion.trim() || null) : null,
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

              {/* Pagos directos combinables */}
              <section className="space-y-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  💵 Pagos directos
                </h3>
                <PagosEditor
                  pagos={pagos}
                  setPagos={setPagos}
                  precioVenta={parseInt(precioVenta || "0") || 0}
                  monedaOC={monedaModelo}
                  totalPermutas={hayPermuta ? totalPermutas : 0}
                  permutasPorMoneda={
                    hayPermuta
                      ? permutas.reduce(
                          (acc, pp) => {
                            const v = parseInt(pp.valor || "0") || 0
                            const m = (pp.moneda || monedaModelo) as "ARS" | "USD"
                            acc[m] = (acc[m] || 0) + v
                            return acc
                          },
                          { ARS: 0, USD: 0 }
                        )
                      : { ARS: 0, USD: 0 }
                  }
                  montoFinanciado={
                    hayFinanciacion
                      ? (parseInt(cuotas || "0") || 0) *
                          (parseInt(valorCuota || "0") || 0) +
                        (parseInt(entrega || "0") || 0)
                      : 0
                  }
                />
              </section>

              {/* Permutas (parte de pago) — pueden ser varias */}
              {hayPermuta && (
                <section className="space-y-3 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                      🔄 Partes de pago ({permutas.length}) — motos que entrega el cliente
                    </h3>
                    <button
                      type="button"
                      onClick={() => setPermutas((prev) => [...prev, permutaVacia(monedaModelo)])}
                      className="text-xs font-semibold text-purple-700 dark:text-purple-300 hover:underline"
                    >
                      + Agregar otra
                    </button>
                  </div>

                  {permutas.map((pp, idx) => {
                    const updatePermuta = (patch: Partial<PermutaForm>) =>
                      setPermutas((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, ...patch } : p))
                      )
                    return (
                      <div
                        key={idx}
                        className="rounded-md border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-neutral-900 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                            Permuta #{idx + 1}
                          </span>
                          {permutas.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setPermutas((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-xs text-red-600 hover:underline"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Marca</Label>
                            <Input
                              value={pp.marca}
                              onChange={(e) => updatePermuta({ marca: e.target.value })}
                              placeholder="Honda"
                            />
                          </div>
                          <div>
                            <Label>Modelo</Label>
                            <Input
                              value={pp.modelo}
                              onChange={(e) => updatePermuta({ modelo: e.target.value })}
                              placeholder="Wave 110"
                            />
                          </div>
                          <div>
                            <Label>Año</Label>
                            <Input
                              type="number"
                              value={pp.anio}
                              onChange={(e) => updatePermuta({ anio: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Km</Label>
                            <Input
                              type="number"
                              value={pp.km}
                              onChange={(e) => updatePermuta({ km: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Patente</Label>
                            <Input
                              value={pp.patente}
                              onChange={(e) =>
                                updatePermuta({ patente: e.target.value.toUpperCase() })
                              }
                            />
                          </div>
                          <div>
                            <Label>Valor tomado *</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={pp.valor}
                                onChange={(e) => updatePermuta({ valor: e.target.value })}
                                className="flex-1"
                              />
                              <select
                                value={pp.moneda || monedaModelo}
                                onChange={(e) => updatePermuta({ moneda: e.target.value })}
                                className="w-20 h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 text-sm"
                              >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label>Nº chasis</Label>
                            <Input
                              value={pp.chasis}
                              onChange={(e) => updatePermuta({ chasis: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Nº motor</Label>
                            <Input
                              value={pp.motor}
                              onChange={(e) => updatePermuta({ motor: e.target.value })}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Notas/descripción</Label>
                            <Textarea
                              value={pp.descripcion}
                              onChange={(e) => updatePermuta({ descripcion: e.target.value })}
                              placeholder="Estado general, detalles, observaciones..."
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Checklist de accesorios que entrega el cliente */}
                        <div className="rounded-md border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-neutral-900 p-3 space-y-2">
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                            ✓ Qué entrega el cliente
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { key: "tieneTitulo" as const, label: "Título" },
                              { key: "tieneManual" as const, label: "Manual" },
                              { key: "tieneSegundaLlave" as const, label: "2da llave" },
                              { key: "tieneCasco" as const, label: "Casco" },
                              { key: "tieneVtv" as const, label: "VTV" },
                              { key: "tieneSeguro" as const, label: "Seguro" },
                              { key: "tieneFactura" as const, label: "Factura" },
                              { key: "tieneFichaTecnica" as const, label: "Ficha técnica" },
                            ].map((item) => (
                              <label
                                key={item.key}
                                className="flex items-center gap-1.5 cursor-pointer text-xs hover:bg-gray-50 dark:hover:bg-neutral-800 rounded px-1.5 py-1"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!pp[item.key]}
                                  onChange={(e) => updatePermuta({ [item.key]: e.target.checked })}
                                />
                                <span>{item.label}</span>
                              </label>
                            ))}
                          </div>
                          <Input
                            value={pp.accesoriosExtra}
                            onChange={(e) => updatePermuta({ accesoriosExtra: e.target.value })}
                            placeholder="Otros accesorios (maleta, GPS, escape, etc)"
                            className="h-8 text-xs"
                          />
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 italic px-1">
                          Esta moto se va a cargar al catálogo como usada (inactiva
                          hasta que la actives desde /admin/modelos).
                        </p>
                      </div>
                    )
                  })}

                  {totalPermutas > 0 && (
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-mono px-1">
                      Total tomado en permuta: ${totalPermutas.toLocaleString("es-AR")}
                    </p>
                  )}
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

                  {/* Garante (sub-bloque dentro de financiación) */}
                  <div className="rounded-md border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-neutral-900 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Garante (opcional)
                      </h4>
                      {(garanteNombre || garanteApellido || garanteDni) && (
                        <button
                          type="button"
                          onClick={() => {
                            setGaranteNombre("")
                            setGaranteApellido("")
                            setGaranteDni("")
                            setGaranteTelefono("")
                            setGaranteDireccion("")
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="garanteApellido">Apellido</Label>
                        <Input
                          id="garanteApellido"
                          value={garanteApellido}
                          onChange={(e) => setGaranteApellido(e.target.value)}
                          placeholder="Pérez"
                        />
                      </div>
                      <div>
                        <Label htmlFor="garanteNombre">Nombre</Label>
                        <Input
                          id="garanteNombre"
                          value={garanteNombre}
                          onChange={(e) => setGaranteNombre(e.target.value)}
                          placeholder="Juan"
                        />
                      </div>
                      <div>
                        <Label htmlFor="garanteDni">DNI</Label>
                        <Input
                          id="garanteDni"
                          value={garanteDni}
                          onChange={(e) => setGaranteDni(e.target.value.replace(/\D/g, ""))}
                          placeholder="12345678"
                        />
                      </div>
                      <div>
                        <Label htmlFor="garanteTelefono">Teléfono</Label>
                        <Input
                          id="garanteTelefono"
                          value={garanteTelefono}
                          onChange={(e) => setGaranteTelefono(e.target.value)}
                          placeholder="2914567890"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="garanteDireccion">Dirección</Label>
                        <Input
                          id="garanteDireccion"
                          value={garanteDireccion}
                          onChange={(e) => setGaranteDireccion(e.target.value)}
                          placeholder="Av. Colón 1500, Bahía Blanca"
                        />
                      </div>
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

"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, Plus, Trash2, Lock } from "lucide-react"
import { ClienteSelector, type ClienteOption } from "./cliente-selector"
import { MotoSelector, type ModeloOption } from "./moto-selector"
import { PagosEditor, pagoVacio, type PagoForm } from "./pagos-editor"
import { OcrDocButton } from "./ocr-doc-button"

// Una permuta dentro de la OC (form usa strings).
export type PermutaForm = {
  // ID Si es una permuta existente (para distinguir de nuevas)
  id?: string
  marca: string
  modelo: string
  anio: string
  kilometros: string
  patente: string
  chasis: string
  motor: string
  descripcion: string
  valor: string
  moneda: string  // "ARS" | "USD"
  // ID de la moto en stock asociada (si ya se subió). Si esta seteado,
  // significa que la permuta ya fue procesada y no se puede editar libremente.
  motoRecibidaId?: string | null
  // Solo para permutas nuevas (sin id): si se sube al stock como usada
  subirAlStock?: boolean
  // Checklist de accesorios que entrega el cliente con la moto
  tieneTitulo?: boolean
  tieneManual?: boolean
  tieneSegundaLlave?: boolean
  tieneCasco?: boolean
  tieneVtv?: boolean
  tieneSeguro?: boolean
  tieneFactura?: boolean
  tieneFichaTecnica?: boolean
  accesoriosExtra?: string
}

const permutaVacia = (moneda: string = "ARS"): PermutaForm => ({
  marca: "", modelo: "", anio: "", kilometros: "", patente: "",
  chasis: "", motor: "", descripcion: "", valor: "", moneda, subirAlStock: true,
  tieneTitulo: false, tieneManual: false, tieneSegundaLlave: false,
  tieneCasco: false, tieneVtv: false, tieneSeguro: false,
  tieneFactura: false, tieneFichaTecnica: false, accesoriosExtra: "",
})

export type OCData = {
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

const EMPTY: OCData = {
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

export function OCForm({
  initialData,
  initialPermutas = [],
  initialPagos = [],
  initialGarante,
  clientes,
  modelos,
  saveAction,
}: {
  initialData?: Partial<OCData> & { id?: string }
  initialPermutas?: PermutaForm[]
  initialPagos?: PagoForm[]
  initialGarante?: {
    nombre: string
    apellido: string
    dni: string
    telefono: string
    direccion: string
  }
  clientes: ClienteOption[]
  modelos: ModeloOption[]
  saveAction: (data: FormData) => Promise<{ error?: string; id?: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<OCData>({ ...EMPTY, ...initialData })
  const monedaOCInit = (initialData?.moneda as string) || "ARS"
  const [permutas, setPermutas] = useState<PermutaForm[]>(
    initialPermutas.length > 0 ? initialPermutas : [permutaVacia(monedaOCInit)]
  )
  const [pagos, setPagos] = useState<PagoForm[]>(
    initialPagos.length > 0 ? initialPagos : [pagoVacio(monedaOCInit)]
  )
  // Motos extras creadas vía "Cargar moto nueva al catálogo" desde el
  // MotoSelector. Se concatenan al prop modelos para que aparezcan
  // disponibles sin recargar la página.
  const [modelosExtras, setModelosExtras] = useState<ModeloOption[]>([])
  const modelosDisponibles = useMemo(
    () => [...modelosExtras, ...modelos],
    [modelos, modelosExtras]
  )
  const [garante, setGarante] = useState({
    nombre: initialGarante?.nombre || "",
    apellido: initialGarante?.apellido || "",
    dni: initialGarante?.dni || "",
    telefono: initialGarante?.telefono || "",
    direccion: initialGarante?.direccion || "",
  })
  const [error, setError] = useState("")

  const set = <K extends keyof OCData>(key: K, value: OCData[K]) => {
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

    // Serializar permutas (filtrar las vacías) y garante
    const hayPermuta = data.formaPago === "Permuta" || data.formaPago === "Mixta"
    const hayFin = data.formaPago === "Financiado" || data.formaPago === "Mixta"
    const permutasFiltradas = hayPermuta
      ? permutas
          .filter((p) => p.marca.trim() || p.modelo.trim() || p.valor.trim())
          .map((p) => ({
            id: p.id ?? null,
            marca: p.marca.trim() || null,
            modelo: p.modelo.trim() || null,
            anio: p.anio ? parseInt(p.anio) : null,
            kilometros: p.kilometros ? parseInt(p.kilometros) : null,
            patente: p.patente.trim().toUpperCase() || null,
            chasis: p.chasis.trim() || null,
            motor: p.motor.trim() || null,
            descripcion: p.descripcion.trim() || null,
            valor: p.valor ? parseInt(p.valor) : 0,
            moneda: p.moneda || data.moneda || "ARS",
            motoRecibidaId: p.motoRecibidaId ?? null,
            subirAlStock: !!p.subirAlStock,
            // Checklist de accesorios que entrega
            tieneTitulo: !!p.tieneTitulo,
            tieneManual: !!p.tieneManual,
            tieneSegundaLlave: !!p.tieneSegundaLlave,
            tieneCasco: !!p.tieneCasco,
            tieneVtv: !!p.tieneVtv,
            tieneSeguro: !!p.tieneSeguro,
            tieneFactura: !!p.tieneFactura,
            tieneFichaTecnica: !!p.tieneFichaTecnica,
            accesoriosExtra: (p.accesoriosExtra || "").trim() || null,
          }))
      : []
    formData.append("permutas", JSON.stringify(permutasFiltradas))

    // Pagos directos (efectivo, transferencia, etc) — combinables siempre.
    // Filtramos los renglones vacíos (sin monto válido).
    const pagosFiltrados = pagos
      .filter((p) => {
        const n = parseInt(p.monto || "0")
        return Number.isFinite(n) && n > 0
      })
      .map((p) => ({
        id: p.id ?? null,
        metodo: p.metodo,
        monto: parseInt(p.monto),
        moneda: p.moneda || data.moneda || "ARS",
        detalle: p.detalle.trim() || null,
        fecha: p.fecha || null,
      }))
    formData.append("pagos", JSON.stringify(pagosFiltrados))

    if (hayFin) {
      formData.append("garanteNombre", garante.nombre.trim())
      formData.append("garanteApellido", garante.apellido.trim())
      formData.append("garanteDni", garante.dni.trim())
      formData.append("garanteTelefono", garante.telefono.trim())
      formData.append("garanteDireccion", garante.direccion.trim())
    }

    startTransition(async () => {
      const result = await saveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        if (result?.id) {
          // Si es nueva OC (no había id inicial) → agregar ?recien=1 para mostrar banner con PDF
          const esNueva = !initialData?.id
          router.push(
            `/admin/ordenes-compra/${result.id}${esNueva ? "?recien=1" : ""}`
          )
        } else {
          router.push("/admin/ordenes-compra")
        }
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/ordenes-compra" />}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {initialData?.id ? "Editar OC" : "Nueva OC"}
          </h1>
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle>Moto a vender</CardTitle>
              <OcrDocButton
                tipo="CEDULA_VERDE"
                label="Scanear cédula"
                onResult={(d) => {
                  setData((prev) => ({
                    ...prev,
                    motoDescripcion:
                      d.marca && d.modelo
                        ? `${d.marca} ${d.modelo}${d.anio ? ` ${d.anio}` : ""}`
                        : prev.motoDescripcion,
                    motoChasis: d.chasis || prev.motoChasis,
                    motoMotor: d.motor || prev.motoMotor,
                    motoPatente: d.patente || prev.motoPatente,
                    motoAnio: d.anio != null ? String(d.anio) : prev.motoAnio,
                  }))
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 overflow-visible">
            <div>
              <Label>Elegí del catálogo o cargá una nueva</Label>
              <MotoSelector
                modelos={modelosDisponibles}
                value={data.modeloId}
                onChange={(id) => set("modeloId", id)}
                onPick={onPickMoto}
                onNuevaMoto={(m) => {
                  setModelosExtras((prev) => [m, ...prev])
                }}
              />
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
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
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm"
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
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm"
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

        {/* Pagos directos combinables (efectivo, transferencia, tarjeta, etc) */}
        <Card>
          <CardHeader>
            <CardTitle>Pagos directos</CardTitle>
          </CardHeader>
          <CardContent>
            <PagosEditor
              pagos={pagos}
              setPagos={setPagos}
              precioVenta={parseInt(data.precioVenta || "0") || 0}
              monedaOC={data.moneda || "ARS"}
              totalPermutas={
                data.formaPago === "Permuta" || data.formaPago === "Mixta"
                  ? permutas.reduce((s, p) => s + (parseInt(p.valor || "0") || 0), 0)
                  : 0
              }
              permutasPorMoneda={
                data.formaPago === "Permuta" || data.formaPago === "Mixta"
                  ? permutas.reduce(
                      (acc, p) => {
                        const v = parseInt(p.valor || "0") || 0
                        const m = (p.moneda || data.moneda || "ARS") as "ARS" | "USD"
                        acc[m] = (acc[m] || 0) + v
                        return acc
                      },
                      { ARS: 0, USD: 0 }
                    )
                  : { ARS: 0, USD: 0 }
              }
              montoFinanciado={
                data.formaPago === "Financiado" || data.formaPago === "Mixta"
                  ? (parseInt(data.cuotas || "0") || 0) *
                      (parseInt(data.valorCuota || "0") || 0) +
                    (parseInt(data.entrega || "0") || 0)
                  : 0
              }
            />
          </CardContent>
        </Card>

        {(data.formaPago === "Permuta" || data.formaPago === "Mixta") && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Partes de pago ({permutas.length})</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermutas((prev) => [...prev, permutaVacia(data.moneda || "ARS")])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar otra
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {permutas.map((pp, idx) => {
                const upd = (patch: Partial<PermutaForm>) =>
                  setPermutas((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, ...patch } : p))
                  )
                const yaEnStock = !!pp.motoRecibidaId
                return (
                  <div
                    key={pp.id ?? `nueva-${idx}`}
                    className={`rounded-md border p-3 space-y-3 ${
                      yaEnStock
                        ? "border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10"
                        : "border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          Permuta #{idx + 1}
                        </span>
                        {yaEnStock && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                            <Lock className="size-3" />
                            En stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!yaEnStock && (
                          <OcrDocButton
                            tipo="CEDULA_VERDE"
                            label="Scanear cédula"
                            onResult={(d) => {
                              upd({
                                marca: d.marca || pp.marca,
                                modelo: d.modelo || pp.modelo,
                                anio: d.anio != null ? String(d.anio) : pp.anio,
                                patente: d.patente || pp.patente,
                                chasis: d.chasis || pp.chasis,
                                motor: d.motor || pp.motor,
                              })
                            }}
                          />
                        )}
                        {permutas.length > 1 && !yaEnStock && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPermutas((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {yaEnStock && (
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">
                        Esta permuta ya creó una moto en el catálogo. Si necesitás
                        cambiar la marca/modelo, editá la moto desde el catálogo
                        para mantener todo sincronizado.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Marca</Label>
                        <Input
                          value={pp.marca}
                          onChange={(e) => upd({ marca: e.target.value })}
                          placeholder="Honda"
                          disabled={yaEnStock}
                        />
                      </div>
                      <div>
                        <Label>Modelo</Label>
                        <Input
                          value={pp.modelo}
                          onChange={(e) => upd({ modelo: e.target.value })}
                          placeholder="Wave 110"
                          disabled={yaEnStock}
                        />
                      </div>
                      <div>
                        <Label>Año</Label>
                        <Input
                          type="number"
                          value={pp.anio}
                          onChange={(e) => upd({ anio: e.target.value })}
                          disabled={yaEnStock}
                        />
                      </div>
                      <div>
                        <Label>Km</Label>
                        <Input
                          type="number"
                          value={pp.kilometros}
                          onChange={(e) => upd({ kilometros: e.target.value })}
                          disabled={yaEnStock}
                        />
                      </div>
                      <div>
                        <Label>Patente</Label>
                        <Input
                          value={pp.patente}
                          onChange={(e) => upd({ patente: e.target.value.toUpperCase() })}
                          disabled={yaEnStock}
                        />
                      </div>
                      <div>
                        <Label>Valor tomado</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={pp.valor}
                            onChange={(e) => upd({ valor: e.target.value })}
                            className="flex-1"
                          />
                          <select
                            value={pp.moneda || "ARS"}
                            onChange={(e) => upd({ moneda: e.target.value })}
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
                          onChange={(e) => upd({ chasis: e.target.value })}
                          disabled={yaEnStock}
                        />
                      </div>
                      <div>
                        <Label>Nº motor</Label>
                        <Input
                          value={pp.motor}
                          onChange={(e) => upd({ motor: e.target.value })}
                          disabled={yaEnStock}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Notas/descripción</Label>
                        <Textarea
                          value={pp.descripcion}
                          onChange={(e) => upd({ descripcion: e.target.value })}
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Checklist de accesorios que entrega el cliente con la moto.
                        Importante porque la moto va a entrar a la venta y el
                        vendedor necesita saber qué trae. */}
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
                              onChange={(e) => upd({ [item.key]: e.target.checked })}
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                      <Input
                        value={pp.accesoriosExtra || ""}
                        onChange={(e) => upd({ accesoriosExtra: e.target.value })}
                        placeholder="Otros accesorios (maleta, GPS, escape Leovince, etc.)"
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Las permutas se suben SIEMPRE al catalogo como inactivas
                        (slug mf-XXXX). El admin puede activarlas mas tarde desde
                        /admin/modelos cuando complete fotos y precio. */}
                    {!pp.id && !yaEnStock && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Esta moto se va a cargar al catálogo como usada (inactiva
                        hasta que la actives desde la lista de motos).
                      </p>
                    )}
                  </div>
                )
              })}
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

              {/* Garante (sub-bloque) */}
              <div className="rounded-md border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 p-3 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Garante (opcional)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Apellido</Label>
                    <Input
                      value={garante.apellido}
                      onChange={(e) => setGarante((g) => ({ ...g, apellido: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={garante.nombre}
                      onChange={(e) => setGarante((g) => ({ ...g, nombre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>DNI</Label>
                    <Input
                      value={garante.dni}
                      onChange={(e) =>
                        setGarante((g) => ({ ...g, dni: e.target.value.replace(/\D/g, "") }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={garante.telefono}
                      onChange={(e) => setGarante((g) => ({ ...g, telefono: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <Input
                      value={garante.direccion}
                      onChange={(e) => setGarante((g) => ({ ...g, direccion: e.target.value }))}
                    />
                  </div>
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
                className="w-full h-10 rounded-md border border-gray-200 dark:border-neutral-800 px-3 text-sm"
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

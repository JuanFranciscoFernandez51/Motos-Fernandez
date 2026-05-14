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
import {
  PagosEditor,
  pagoVacio,
  type PagoForm,
  type FinanciacionForm,
  type GaranteForm,
} from "./pagos-editor"
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
  // formaPago se sigue calculando y guardando en DB, pero ya no se elige
  // a mano en el UI nuevo — se infiere de lo cargado (pagos + permutas
  // + financiacion). Lo dejamos en OCData por compatibilidad.
  formaPago: string
  // Campos legacy: ya no se editan desde el form nuevo, pero los mantenemos
  // para no romper OCs viejas que los tengan poblados. Los seteamos en
  // null al guardar desde el form nuevo.
  sena: string
  saldo: string
  detallePago: string
  permutaDescripcion: string
  permutaValor: string
  // Financiacion: cuotas y valorCuota describen el plan de pago al
  // cliente (puede incluir intereses → cuotas*valorCuota >= capital).
  // montoFinanciado es el CAPITAL — lo que se descuenta del precio para
  // cuadrar el balance. Es independiente de cuotas*valorCuota.
  cuotas: string
  valorCuota: string
  entrega: string
  montoFinanciado: string
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
  montoFinanciado: "",
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
  const [pagos, setPagos] = useState<PagoForm[]>(() => {
    // Si la OC ya tenia una financiacion guardada (capital + cuotas), la
    // representamos como un pago virtual con metodo FINANCIACION para
    // que el usuario la vea y la pueda editar dentro del editor unificado.
    // No tocamos el OCPago real en DB — al guardar, el server lee
    // montoFinanciado/cuotas del formData y actualiza FinanciacionOC.
    const yaHayFinPago = initialPagos.some((p) => p.metodo === "FINANCIACION")
    const capitalInicial = parseInt(initialData?.montoFinanciado || "0") || 0
    const tieneFinanciacionExistente =
      capitalInicial > 0 ||
      (parseInt(initialData?.cuotas || "0") || 0) > 0
    if (
      tieneFinanciacionExistente &&
      !yaHayFinPago &&
      initialPagos.length > 0
    ) {
      // Solo agregamos el virtual si NO existe ya un pago FINANCIACION
      // (algunas OCs ya migradas pueden tenerlo).
      return [
        ...initialPagos,
        {
          id: null,
          metodo: "FINANCIACION",
          monto: capitalInicial > 0 ? String(capitalInicial) : "",
          moneda: monedaOCInit,
          detalle: "Plan de cuotas",
          fecha: "",
        },
      ]
    }
    if (initialPagos.length > 0) return initialPagos
    // OC nueva sin pagos: si viene con financiación cargada (raro pero
    // posible al editar OC vieja), arrancamos solo con el pago FINANCIACION.
    if (tieneFinanciacionExistente) {
      return [
        {
          id: null,
          metodo: "FINANCIACION",
          monto: capitalInicial > 0 ? String(capitalInicial) : "",
          moneda: monedaOCInit,
          detalle: "Plan de cuotas",
          fecha: "",
        },
      ]
    }
    return [pagoVacio(monedaOCInit)]
  })
  // Motos extras creadas vía "Cargar moto nueva al catálogo" desde el
  // MotoSelector. Se concatenan al prop modelos para que aparezcan
  // disponibles sin recargar la página.
  const [modelosExtras, setModelosExtras] = useState<ModeloOption[]>([])
  const modelosDisponibles = useMemo(
    () => [...modelosExtras, ...modelos],
    [modelos, modelosExtras]
  )
  const [garante, setGarante] = useState<GaranteForm>({
    nombre: initialGarante?.nombre || "",
    apellido: initialGarante?.apellido || "",
    dni: initialGarante?.dni || "",
    telefono: initialGarante?.telefono || "",
    direccion: initialGarante?.direccion || "",
  })
  // Plan de financiacion (cuotas, valor, entrega). El capital sale del
  // monto del pago con metodo=FINANCIACION en la lista de pagos.
  const [financiacion, setFinanciacion] = useState<FinanciacionForm>({
    cuotas: initialData?.cuotas || "",
    valorCuota: initialData?.valorCuota || "",
    entrega: initialData?.entrega || "",
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

  // Calculo derivado: hay permutas / hay financiacion? Se computa segun
  // los datos cargados — no necesitamos preguntar formaPago al usuario.
  const hayPermutaActiva = permutas.some(
    (p) => p.marca.trim() || p.modelo.trim() || p.valor.trim()
  )
  // El pago con metodo FINANCIACION trae el capital en su `monto`.
  const pagoFin = pagos.find((p) => p.metodo === "FINANCIACION")
  const hayFinanciacionActiva = !!pagoFin
  // Capital = monto del pago FINANCIACION (no se duplica en data.montoFinanciado).
  const capitalFinanciado = pagoFin
    ? parseInt(pagoFin.monto || "0") || 0
    : 0

  // Forma de pago = derivada de lo que se cargo
  const formaPagoCalculada = (() => {
    if (hayPermutaActiva && hayFinanciacionActiva) return "Mixta"
    if (hayPermutaActiva) return "Permuta"
    if (hayFinanciacionActiva) return "Financiado"
    return "Contado"
  })()

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
    // Sincronizamos los campos derivados al guardar:
    //  - formaPago: calculada (ya no la pide el usuario)
    //  - cuotas / valorCuota / entrega: vienen del state financiacion
    //  - montoFinanciado: capital = monto del pago FINANCIACION (si hay)
    const dataAGuardar = {
      ...data,
      formaPago: formaPagoCalculada,
      cuotas: financiacion.cuotas,
      valorCuota: financiacion.valorCuota,
      entrega: financiacion.entrega,
      montoFinanciado: pagoFin ? pagoFin.monto : "",
    }
    Object.entries(dataAGuardar).forEach(([k, v]) =>
      formData.append(k, String(v ?? ""))
    )

    // Serializar permutas siempre (no condicional a formaPago).
    const permutasFiltradas = permutas
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

    // Garante (solo tiene sentido si hay financiacion)
    if (hayFinanciacionActiva) {
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

      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Balance: precio vs cobertura, siempre visible arriba para que
            sepas en cualquier momento si la OC esta cuadrada o no. */}
        <BalanceCard
          precioVenta={parseInt(data.precioVenta || "0") || 0}
          monedaOC={data.moneda || "ARS"}
          pagosPorMoneda={pagos.reduce(
            (acc, p) => {
              const v = parseInt(p.monto || "0") || 0
              if (!Number.isFinite(v) || v <= 0) return acc
              const m = (p.moneda || data.moneda || "ARS") as "ARS" | "USD"
              acc[m] = (acc[m] || 0) + v
              return acc
            },
            { ARS: 0, USD: 0 }
          )}
          permutasPorMoneda={permutas.reduce(
            (acc, p) => {
              const v = parseInt(p.valor || "0") || 0
              if (!Number.isFinite(v) || v <= 0) return acc
              const m = (p.moneda || data.moneda || "ARS") as "ARS" | "USD"
              acc[m] = (acc[m] || 0) + v
              return acc
            },
            { ARS: 0, USD: 0 }
          )}
          // El capital financiado ya esta dentro de pagos (metodo FINANCIACION),
          // no se cuenta aparte.
          montoFinanciado={0}
          formaPagoCalculada={formaPagoCalculada}
        />

        <Card className="overflow-visible">
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

        <Card className="overflow-visible">
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

        {/* Precio + moneda principal de la OC. El resto del dinero
            (cuanto se paga en efectivo, en cheque, en permuta, en
            financiacion) se carga abajo en sus secciones — la forma
            de pago se calcula sola. */}
        <Card>
          <CardHeader>
            <CardTitle>Precio de venta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div>
                <Label htmlFor="precioVenta">Precio *</Label>
                <Input
                  id="precioVenta"
                  type="number"
                  value={data.precioVenta}
                  onChange={(e) => set("precioVenta", e.target.value)}
                  placeholder="1500000"
                  required
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
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
              Forma de pago: <strong>{formaPagoCalculada}</strong> (se
              calcula segun lo que cargues abajo).
            </p>
          </CardContent>
        </Card>

        {/* Pagos: cualquier combinación (efectivo, transferencia, tarjeta,
            cheque, financiación, etc). Si elegís FINANCIACION en un
            renglón se expande con el plan de cuotas + garante. */}
        <Card>
          <CardHeader>
            <CardTitle>Pagos</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Sumá los pagos que recibís. Si la venta es financiada, elegí
              método "Financiación" y se abre el plan de cuotas inline.
            </p>
          </CardHeader>
          <CardContent>
            <PagosEditor
              pagos={pagos}
              setPagos={setPagos}
              precioVenta={parseInt(data.precioVenta || "0") || 0}
              monedaOC={data.moneda || "ARS"}
              totalPermutas={permutas.reduce(
                (s, p) => s + (parseInt(p.valor || "0") || 0),
                0
              )}
              permutasPorMoneda={permutas.reduce(
                (acc, p) => {
                  const v = parseInt(p.valor || "0") || 0
                  const m = (p.moneda || data.moneda || "ARS") as "ARS" | "USD"
                  acc[m] = (acc[m] || 0) + v
                  return acc
                },
                { ARS: 0, USD: 0 }
              )}
              // El capital financiado ya viene como un pago en la lista
              // (metodo FINANCIACION). No lo contamos aparte para no
              // sumar doble.
              montoFinanciado={0}
              financiacion={financiacion}
              setFinanciacion={setFinanciacion}
              garante={garante}
              setGarante={setGarante}
            />
          </CardContent>
        </Card>

        {/* Permutas — siempre visible. Si no hay ninguna cargada queda
            con un slot vacío que se ignora al guardar (mismo comportamiento
            que antes). El usuario agrega con el botón. */}
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle>Permutas / Parte de pago</CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Motos que el cliente entrega como parte del pago. Si no
                    hay, dejá vacío.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermutas((prev) => [...prev, permutaVacia(data.moneda || "ARS")])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar permuta
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

        {/* Card "Financiación / Plan de cuotas" eliminada — todo se carga
            ahora desde el editor de Pagos eligiendo método=FINANCIACION,
            que abre un sub-panel inline con cuotas, valor, entrega y garante. */}

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

        <Card>
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

// =====================================================================
// Subcomponentes auxiliares del OCForm
// =====================================================================

/**
 * Card de balance arriba del form. Muestra precio vs lo cubierto
 * (pagos + permutas + capital financiado), separado por moneda.
 * Se actualiza en vivo a medida que el admin carga datos.
 */
function BalanceCard({
  precioVenta,
  monedaOC,
  pagosPorMoneda,
  permutasPorMoneda,
  montoFinanciado,
  formaPagoCalculada,
}: {
  precioVenta: number
  monedaOC: string
  pagosPorMoneda: { ARS: number; USD: number }
  permutasPorMoneda: { ARS: number; USD: number }
  montoFinanciado: number
  formaPagoCalculada: string
}) {
  const cubiertoARS = pagosPorMoneda.ARS + permutasPorMoneda.ARS
  const cubiertoUSD = pagosPorMoneda.USD + permutasPorMoneda.USD
  const cubiertoEnMoneda =
    monedaOC === "USD"
      ? cubiertoUSD + montoFinanciado
      : cubiertoARS + montoFinanciado
  const falta = precioVenta - cubiertoEnMoneda
  const cuadrado = falta === 0 && precioVenta > 0
  const haySecundaria =
    monedaOC === "USD"
      ? cubiertoARS > 0
      : cubiertoUSD > 0

  const fmt = (n: number, m: string) =>
    `${m === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`

  return (
    <div className="rounded-xl border-2 border-[#6B4F7A]/30 bg-gradient-to-r from-[#6B4F7A]/5 to-transparent p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
            Balance de la OC
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Forma de pago: <strong>{formaPagoCalculada}</strong>
          </p>
        </div>
        <div className="text-right">
          {precioVenta > 0 ? (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {fmt(precioVenta, monedaOC)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                Precio de venta
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Cargá un precio para ver el balance
            </p>
          )}
        </div>
      </div>

      {precioVenta > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-white dark:bg-neutral-900 border p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cubierto en {monedaOC}
            </p>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {fmt(cubiertoEnMoneda, monedaOC)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {fmt(
                monedaOC === "USD" ? pagosPorMoneda.USD : pagosPorMoneda.ARS,
                monedaOC
              )}{" "}
              pagos +{" "}
              {fmt(
                monedaOC === "USD"
                  ? permutasPorMoneda.USD
                  : permutasPorMoneda.ARS,
                monedaOC
              )}{" "}
              permutas
              {montoFinanciado > 0 &&
                ` + ${fmt(montoFinanciado, monedaOC)} financiación`}
            </p>
          </div>
          <div
            className={`rounded-md border p-2.5 ${
              cuadrado
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40"
                : falta > 0
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {cuadrado ? "Estado" : falta > 0 ? "Falta cubrir" : "Sobra"}
            </p>
            <p
              className={`text-base font-bold mt-0.5 ${
                cuadrado
                  ? "text-emerald-700 dark:text-emerald-300"
                  : falta > 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {cuadrado ? "✓ Cuadrado" : fmt(Math.abs(falta), monedaOC)}
            </p>
          </div>
          {haySecundaria && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
                ⚠ Hay {monedaOC === "USD" ? "pesos" : "dólares"} sueltos
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5 leading-snug">
                Combinaste monedas. Conviene aclararlo en observaciones con
                el tipo de cambio aplicado.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Resumen del plan de financiación. Muestra el capital, el total que el
 * cliente va a pagar (cuotas × valor) y la diferencia (intereses) si la hay.
 */
function FinanciacionResumen({
  capital,
  cuotas,
  valorCuota,
  entrega,
  moneda,
}: {
  capital: number
  cuotas: number
  valorCuota: number
  entrega: number
  moneda: string
}) {
  const totalCuotas = cuotas * valorCuota
  const totalAPagar = totalCuotas + entrega
  const intereses = capital > 0 ? totalAPagar - capital : 0
  const tieneIntereses = capital > 0 && intereses > 0
  const fmt = (n: number) =>
    `${moneda === "USD" ? "USD " : "$ "}${n.toLocaleString("es-AR")}`

  return (
    <div className="rounded-md bg-gray-50 dark:bg-neutral-900/60 border border-gray-200 dark:border-neutral-800 p-3 text-xs space-y-1">
      {capital > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">
            Capital a financiar
          </span>
          <span className="font-mono font-semibold">{fmt(capital)}</span>
        </div>
      )}
      {entrega > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">Entrega / anticipo</span>
          <span className="font-mono">{fmt(entrega)}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-300">
          Cuotas × valor ({cuotas} × {fmt(valorCuota)})
        </span>
        <span className="font-mono">{fmt(totalCuotas)}</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-neutral-700">
        <span className="text-gray-700 dark:text-gray-200 font-semibold">
          Total a pagar (entrega + cuotas)
        </span>
        <span className="font-mono font-semibold">{fmt(totalAPagar)}</span>
      </div>
      {tieneIntereses && (
        <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
          <span>Intereses (total − capital)</span>
          <span className="font-mono font-semibold">{fmt(intereses)}</span>
        </div>
      )}
      {capital > 0 && intereses < 0 && (
        <p className="text-[10px] text-red-600 dark:text-red-300 italic">
          ⚠ El total a pagar es menor al capital. Revisá cuotas y valor.
        </p>
      )}
    </div>
  )
}

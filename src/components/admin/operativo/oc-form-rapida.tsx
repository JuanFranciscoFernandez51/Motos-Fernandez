"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  ArrowRight,
} from "lucide-react"

type ClienteMin = { id: string; nombre: string; apellido: string; dni: string | null }

const inputCls =
  "w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-[#6B4F7A] outline-none"
const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1"

/**
 * OC rápida: form corto (cliente + moto + precio) que crea la OC base en
 * borrador y lleva al detalle de la OC para completar pagos/permuta. El form
 * completo (con todo a la vista) sigue disponible en /admin/ordenes-compra/nueva.
 */
export function OCFormRapida({ clientes }: { clientes: ClienteMin[] }) {
  const router = useRouter()

  // Cliente: o se elige uno existente, o se carga uno nuevo
  const [busqueda, setBusqueda] = useState("")
  const [clienteSel, setClienteSel] = useState<ClienteMin | null>(null)
  const [nuevoCliente, setNuevoCliente] = useState(false)
  const [cNombre, setCNombre] = useState("")
  const [cApellido, setCApellido] = useState("")
  const [cDni, setCDni] = useState("")
  const [cTel, setCTel] = useState("")

  // Moto + precio
  const [motoDescripcion, setMotoDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS")

  // Secciones plegables
  const [openUnidad, setOpenUnidad] = useState(false)
  const [chasis, setChasis] = useState("")
  const [motor, setMotor] = useState("")
  const [anio, setAnio] = useState("")
  const [km, setKm] = useState("")

  const [openFin, setOpenFin] = useState(false)
  const [cuotas, setCuotas] = useState("")
  const [valorCuota, setValorCuota] = useState("")

  const [observaciones, setObservaciones] = useState("")

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sugerencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (q.length < 2) return []
    return clientes
      .filter((c) =>
        `${c.nombre} ${c.apellido} ${c.dni || ""}`.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [busqueda, clientes])

  const precioNum = parseInt(precio.replace(/[^\d]/g, ""), 10)
  const precioOk = Number.isFinite(precioNum) && precioNum > 0
  const clienteOk = clienteSel || (nuevoCliente && cNombre.trim() && cApellido.trim())
  const puedeGuardar = clienteOk && motoDescripcion.trim() && precioOk && !guardando

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        motoDescripcion: motoDescripcion.trim(),
        motoChasis: chasis.trim() || undefined,
        motoMotor: motor.trim() || undefined,
        motoAnio: anio ? parseInt(anio, 10) : undefined,
        motoKilometros: km ? parseInt(km.replace(/[^\d]/g, ""), 10) : undefined,
        precioVenta: precioNum,
        moneda,
        cuotas: cuotas ? parseInt(cuotas, 10) : undefined,
        valorCuota: valorCuota ? parseInt(valorCuota.replace(/[^\d]/g, ""), 10) : undefined,
        observaciones: observaciones.trim() || undefined,
      }
      if (clienteSel) {
        body.clienteId = clienteSel.id
      } else {
        body.clienteNombre = cNombre.trim()
        body.clienteApellido = cApellido.trim()
        body.clienteDni = cDni.trim() || undefined
        body.clienteTelefono = cTel.trim() || undefined
      }
      const res = await fetch("/api/admin/crear/orden_compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "No se pudo crear la OC")
        setGuardando(false)
        return
      }
      // Vamos al detalle de la OC para completar pagos/permuta/financiación
      router.push(`/admin/ordenes-compra/${data.id}`)
    } catch {
      setError("Error de conexión")
      setGuardando(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString("es-AR")

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nueva orden de compra</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Lo esencial para crearla. Pagos y parte de pago se completan en el siguiente paso.
          </p>
        </div>
        <Link
          href="/admin/ordenes-compra/nueva"
          className="text-xs text-[#6B4F7A] hover:underline whitespace-nowrap mt-1"
        >
          Operación compleja → form completo
        </Link>
      </div>

      {/* Saldo */}
      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 px-4 py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Precio de venta</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {precioOk ? `${moneda === "USD" ? "U$" : "$"} ${fmt(precioNum)}` : "—"}
        </p>
      </div>

      {/* Datos principales */}
      <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
        {/* Cliente */}
        <div>
          <label className={labelCls}>Cliente comprador</label>
          {clienteSel ? (
            <div className="flex items-center justify-between rounded-md border border-[#6B4F7A]/40 bg-[#6B4F7A]/5 px-3 py-2 text-sm">
              <span className="font-medium">
                {clienteSel.apellido}, {clienteSel.nombre}
                {clienteSel.dni && <span className="text-gray-400 ml-2">DNI {clienteSel.dni}</span>}
              </span>
              <button
                type="button"
                onClick={() => setClienteSel(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cambiar
              </button>
            </div>
          ) : nuevoCliente ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Nombre" value={cNombre} onChange={(e) => setCNombre(e.target.value)} />
                <input className={inputCls} placeholder="Apellido" value={cApellido} onChange={(e) => setCApellido(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="DNI (opcional)" value={cDni} onChange={(e) => setCDni(e.target.value)} />
                <input className={inputCls} placeholder="Teléfono (opcional)" value={cTel} onChange={(e) => setCTel(e.target.value)} />
              </div>
              <button type="button" onClick={() => setNuevoCliente(false)} className="text-xs text-gray-400 hover:text-gray-600">
                ← Buscar uno existente
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Buscar por nombre o DNI…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              {sugerencias.length > 0 && (
                <div className="mt-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm overflow-hidden">
                  {sugerencias.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setClienteSel(c); setBusqueda("") }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700"
                    >
                      {c.apellido}, {c.nombre}
                      {c.dni && <span className="text-gray-400 ml-2">DNI {c.dni}</span>}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setNuevoCliente(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#6B4F7A] hover:underline"
              >
                <UserPlus className="size-3.5" /> Crear cliente nuevo
              </button>
            </div>
          )}
        </div>

        {/* Moto vendida */}
        <div>
          <label className={labelCls}>Moto vendida</label>
          <input
            className={inputCls}
            placeholder="Ej: Yamaha MT-03 2024"
            value={motoDescripcion}
            onChange={(e) => setMotoDescripcion(e.target.value)}
          />
        </div>

        {/* Precio + moneda */}
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <div>
            <label className={labelCls}>Precio de venta</label>
            <input className={inputCls} placeholder="9000000" value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <select className={inputCls} value={moneda} onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plegable: datos de la unidad */}
      <Plegable
        titulo="Datos de la unidad (chasis, motor)"
        abierto={openUnidad}
        toggle={() => setOpenUnidad((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Chasis" value={chasis} onChange={(e) => setChasis(e.target.value)} />
          <input className={inputCls} placeholder="Motor" value={motor} onChange={(e) => setMotor(e.target.value)} />
          <input className={inputCls} placeholder="Año" value={anio} onChange={(e) => setAnio(e.target.value)} inputMode="numeric" />
          <input className={inputCls} placeholder="Kilómetros" value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" />
        </div>
      </Plegable>

      {/* Plegable: financiación */}
      <Plegable
        titulo="Financiación (cuotas)"
        abierto={openFin}
        toggle={() => setOpenFin((v) => !v)}
      >
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Cantidad de cuotas" value={cuotas} onChange={(e) => setCuotas(e.target.value)} inputMode="numeric" />
          <input className={inputCls} placeholder="Valor de cada cuota" value={valorCuota} onChange={(e) => setValorCuota(e.target.value)} inputMode="numeric" />
        </div>
      </Plegable>

      <div>
        <label className={labelCls}>Observaciones (opcional)</label>
        <textarea className={`${inputCls} min-h-[60px]`} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 px-3 py-2 text-[12px] text-blue-800 dark:text-blue-300">
        💡 Los <strong>pagos / anticipo</strong> y la <strong>parte de pago (permuta)</strong> los cargás en la OC apenas se crea (te lleva directo al siguiente paso).
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={!puedeGuardar}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6B4F7A] hover:bg-[#8B6F9A] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-bold text-white transition-colors"
        >
          {guardando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Crear orden de compra
          {!guardando && <ArrowRight className="size-4" />}
        </button>
        <span className="text-xs text-gray-400">Queda en borrador</span>
      </div>
    </div>
  )
}

function Plegable({
  titulo,
  abierto,
  toggle,
  children,
}: {
  titulo: string
  abierto: boolean
  toggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-900"
      >
        {titulo}
        {abierto ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
      </button>
      {abierto && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

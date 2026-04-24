"use client"

import { useState, useEffect } from "react"
import { Calculator, CreditCard, Landmark, AlertTriangle } from "lucide-react"
import { formatPrice } from "@/lib/constants"

interface Plan {
  id: string
  nombre: string
  tipo: string
  cuotas: number
  coeficiente: number
  anticipoMinimo: number
  descripcion?: string | null
}

const PLANES_FALLBACK: Plan[] = [
  { id: "d-p3",  nombre: "3 cuotas",  tipo: "PROPIA",  cuotas: 3,  coeficiente: 0.3741, anticipoMinimo: 40 },
  { id: "d-p6",  nombre: "6 cuotas",  tipo: "PROPIA",  cuotas: 6,  coeficiente: 0.2034, anticipoMinimo: 40 },
  { id: "d-p9",  nombre: "9 cuotas",  tipo: "PROPIA",  cuotas: 9,  coeficiente: 0.1470, anticipoMinimo: 40 },
  { id: "d-p12", nombre: "12 cuotas", tipo: "PROPIA",  cuotas: 12, coeficiente: 0.1193, anticipoMinimo: 40 },
  { id: "d-t3",  nombre: "3 cuotas",  tipo: "TARJETA", cuotas: 3,  coeficiente: 0.3547, anticipoMinimo: 0  },
  { id: "d-t6",  nombre: "6 cuotas",  tipo: "TARJETA", cuotas: 6,  coeficiente: 0.1866, anticipoMinimo: 0  },
  { id: "d-t12", nombre: "12 cuotas", tipo: "TARJETA", cuotas: 12, coeficiente: 0.1025, anticipoMinimo: 0  },
  { id: "d-t18", nombre: "18 cuotas", tipo: "TARJETA", cuotas: 18, coeficiente: 0.0748, anticipoMinimo: 0  },
  { id: "d-t24", nombre: "24 cuotas", tipo: "TARJETA", cuotas: 24, coeficiente: 0.0612, anticipoMinimo: 0  },
]

type TabType = "PROPIA" | "TARJETA"

export function SimuladorFinanciacion() {
  const [monto, setMonto] = useState(800_000)
  const [tab, setTab] = useState<TabType>("PROPIA")
  const [anticipo, setAnticipo] = useState(40)
  const [planes, setPlanes] = useState<Plan[]>(PLANES_FALLBACK)
  const [planSeleccionado, setPlanSeleccionado] = useState<string>("d-p6")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/public/planes-financiacion")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlanes(data)
          // Seleccionar el segundo plan del tab actual por defecto
          const propios = data.filter((p: Plan) => p.tipo === "PROPIA")
          if (propios[1]) setPlanSeleccionado(propios[1].id)
          else if (propios[0]) setPlanSeleccionado(propios[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const planesTab = planes.filter((p) => p.tipo === tab)
  const anticipoOpciones = tab === "PROPIA" ? [40, 50, 60, 70] : [0, 20, 30, 40, 50]

  const handleTabChange = (t: TabType) => {
    setTab(t)
    setAnticipo(t === "PROPIA" ? 40 : 0)
    // Seleccionar segundo plan del nuevo tab
    const nuevosPlanes = planes.filter((p) => p.tipo === t)
    if (nuevosPlanes[1]) setPlanSeleccionado(nuevosPlanes[1].id)
    else if (nuevosPlanes[0]) setPlanSeleccionado(nuevosPlanes[0].id)
  }

  const anticipoPct = anticipo
  const montoAnticipo = Math.round((monto * anticipoPct) / 100)
  const montoFinanciado = monto - montoAnticipo

  const planActivo = planesTab.find((p) => p.id === planSeleccionado) ?? planesTab[0]
  const cuotaMensual = planActivo ? Math.round(montoFinanciado * planActivo.coeficiente) : 0
  const totalAPagar = planActivo
    ? Math.round(montoAnticipo + montoFinanciado * planActivo.coeficiente * planActivo.cuotas)
    : 0

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B4F7A] to-[#9B59B6] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-white/20 dark:bg-neutral-900/20">
            <Calculator className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">
              Simulador de financiación
            </h2>
            <p className="text-sm text-white/70">
              Calculá la cuota estimada para tu moto
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-[#6B4F7A] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-7">

            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-neutral-800 p-1 gap-1">
              <button
                onClick={() => handleTabChange("PROPIA")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  tab === "PROPIA"
                    ? "bg-white dark:bg-neutral-900 text-[#6B4F7A] shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                }`}
              >
                <Landmark className="size-4" />
                Financiación propia
              </button>
              <button
                onClick={() => handleTabChange("TARJETA")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  tab === "TARJETA"
                    ? "bg-white dark:bg-neutral-900 text-[#6B4F7A] shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                }`}
              >
                <CreditCard className="size-4" />
                Con tarjeta
              </button>
            </div>

            {/* Info del tab */}
            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              tab === "PROPIA" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
            }`}>
              {tab === "PROPIA" ? (
                <><Landmark className="size-4 shrink-0" />Hasta 12 cuotas · TNA 72% · Anticipo mínimo 40%</>
              ) : (
                <><CreditCard className="size-4 shrink-0" />Hasta 24 cuotas · TNA 40% · Podés financiar el total sin anticipo</>
              )}
            </div>

            {/* Slider de monto */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] dark:text-white mb-3">
                Valor del vehículo
              </label>
              <input
                type="range"
                min={100_000}
                max={15_000_000}
                step={100_000}
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full accent-[#6B4F7A]"
              />
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-xs text-gray-400">$100.000</span>
                <span className="text-2xl font-bold text-[#6B4F7A] font-heading">
                  {formatPrice(monto)}
                </span>
                <span className="text-xs text-gray-400">$15.000.000</span>
              </div>
            </div>

            {/* Pills de anticipo */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] dark:text-white mb-3">
                Anticipo
                {tab === "PROPIA" && (
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(mínimo 40%)</span>
                )}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {anticipoOpciones.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setAnticipo(pct)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      anticipo === pct
                        ? "bg-[#6B4F7A] text-white"
                        : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {pct === 0 ? "Sin anticipo" : `${pct}%`}
                  </button>
                ))}
                <span className="text-sm font-bold text-[#6B4F7A] ml-1">
                  → financiás {formatPrice(montoFinanciado)}
                </span>
              </div>
            </div>

            {/* Selector de cuotas */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] dark:text-white mb-3">
                Cantidad de cuotas
              </label>
              <div className="flex gap-2 flex-wrap">
                {planesTab.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setPlanSeleccionado(plan.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                      planSeleccionado === plan.id
                        ? "bg-[#6B4F7A] text-white border-[#6B4F7A] shadow-md scale-105"
                        : "bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-800 hover:border-[#6B4F7A]/40 hover:text-[#6B4F7A]"
                    }`}
                  >
                    {plan.cuotas}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado */}
            {planActivo && (
              <div className="rounded-2xl bg-gradient-to-br from-[#6B4F7A] to-[#9B59B6] p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/70 mb-1">
                      {planActivo.cuotas} cuotas de
                    </p>
                    <p className="text-5xl font-extrabold font-heading tracking-tight">
                      {formatPrice(cuotaMensual)}
                    </p>
                    <p className="text-sm text-white/70 mt-1">por mes</p>
                  </div>
                  <div className="sm:text-right">
                    <div className="bg-white/10 dark:bg-neutral-900/10 rounded-xl px-5 py-3 space-y-1">
                      <div className="text-sm text-white/80">
                        Anticipo: <span className="font-semibold text-white">{formatPrice(montoAnticipo)}</span>
                      </div>
                      <div className="text-sm text-white/80">
                        Total a financiar: <span className="font-bold text-white text-lg">{formatPrice(montoFinanciado)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
              <AlertTriangle className="size-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800 leading-relaxed">
                <span className="font-semibold">Valores orientativos.</span>{" "}
                Las cuotas reales pueden variar según el modelo, perfil crediticio y condiciones vigentes
                al momento de la operación. Consultá con nuestros asesores para un plan personalizado.
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

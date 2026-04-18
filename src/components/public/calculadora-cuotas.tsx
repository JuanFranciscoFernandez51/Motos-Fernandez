"use client"

import { useState, useMemo } from "react"
import { Calculator } from "lucide-react"

interface PlanFinanciacion {
  plan: string
  cuota?: number | null
  entrega?: number | null
  detalle?: string | null
}

interface CalculadoraCuotasProps {
  precio: number
  moneda: string
  financiacion?: PlanFinanciacion[]
}

function formatARS(n: number): string {
  return `$${Math.round(n).toLocaleString("es-AR")}`
}

function formatUSD(n: number): string {
  return `USD ${Math.round(n).toLocaleString("es-AR")}`
}

const PLAZOS = [12, 18, 24, 36, 48]

export function CalculadoraCuotas({ precio, moneda, financiacion = [] }: CalculadoraCuotasProps) {
  // Anticipo: porcentaje del precio (0% a 80%)
  const [anticipoPct, setAnticipoPct] = useState(30)
  const [plazo, setPlazo] = useState(24)

  const formatear = moneda === "USD" ? formatUSD : formatARS

  // TNA estimada cuando no hay planes cargados (configurable)
  const TNA_ESTIMADA = 0.95 // 95% anual aproximado
  const tasaMensual = TNA_ESTIMADA / 12

  // Si hay planes cargados, intentar matchear con el plazo más cercano
  const planMatch = useMemo(() => {
    if (!financiacion.length) return null
    // Buscar plan que mencione el plazo
    return financiacion.find((p) =>
      p.plan?.toLowerCase().includes(`${plazo} cuotas`) ||
      p.plan?.toLowerCase().includes(`${plazo}c`)
    )
  }, [financiacion, plazo])

  const calculo = useMemo(() => {
    const anticipo = (precio * anticipoPct) / 100
    const aFinanciar = precio - anticipo

    let cuotaCalculada: number
    if (planMatch?.cuota && anticipoPct === 30) {
      // Si hay un plan específico cargado y anticipo coincide aproximadamente, usar su cuota
      cuotaCalculada = planMatch.cuota
    } else {
      // Fórmula francés: cuota = capital * (i * (1+i)^n) / ((1+i)^n - 1)
      const factor = Math.pow(1 + tasaMensual, plazo)
      cuotaCalculada = (aFinanciar * (tasaMensual * factor)) / (factor - 1)
    }

    return {
      anticipo,
      aFinanciar,
      cuota: cuotaCalculada,
      total: anticipo + cuotaCalculada * plazo,
    }
  }, [precio, anticipoPct, plazo, planMatch, tasaMensual])

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-9 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center">
          <Calculator className="size-4 text-[#6B4F7A]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1A1A1A]">Calculá tu cuota</h3>
          <p className="text-xs text-gray-500">Simulación rápida y orientativa</p>
        </div>
      </div>

      {/* Anticipo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600">Anticipo</label>
          <span className="text-xs font-bold text-[#6B4F7A]">
            {anticipoPct}% · {formatear(calculo.anticipo)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={80}
          step={5}
          value={anticipoPct}
          onChange={(e) => setAnticipoPct(Number(e.target.value))}
          className="w-full accent-[#6B4F7A]"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>0%</span>
          <span>40%</span>
          <span>80%</span>
        </div>
      </div>

      {/* Plazo */}
      <div className="mt-5 space-y-2">
        <label className="text-xs font-medium text-gray-600 block">Plazo en cuotas</label>
        <div className="grid grid-cols-5 gap-1.5">
          {PLAZOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlazo(p)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                plazo === p
                  ? "border-[#6B4F7A] bg-[#6B4F7A] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-[#6B4F7A]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado */}
      <div className="mt-5 rounded-lg bg-[#6B4F7A]/5 border border-[#6B4F7A]/10 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Cuota mensual</p>
        <p className="mt-1 text-2xl font-extrabold text-[#6B4F7A]">
          {formatear(calculo.cuota)}
        </p>
        <div className="mt-3 pt-3 border-t border-[#6B4F7A]/10 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500">A financiar</p>
            <p className="font-semibold text-[#1A1A1A]">{formatear(calculo.aFinanciar)}</p>
          </div>
          <div>
            <p className="text-gray-500">Total estimado</p>
            <p className="font-semibold text-[#1A1A1A]">{formatear(calculo.total)}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
        Los valores son orientativos y pueden variar según el plan elegido y la aprobación crediticia. Consultanos por WhatsApp para tu plan personalizado.
      </p>
    </div>
  )
}

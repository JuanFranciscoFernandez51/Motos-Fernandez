"use client"

import { useMemo, useState } from "react"
import { Calculator } from "lucide-react"
import {
  MODALIDADES_FINANCIACION,
  calcularCuotaFrancesa,
  type ModalidadFinanciacion,
  type PlanFinanciacionInput,
} from "@/lib/cuota-helper"

interface CalculadoraCuotasProps {
  precio: number
  moneda: string
  financiacion?: PlanFinanciacionInput[]
}

function formatARS(n: number): string {
  return `$${Math.round(n).toLocaleString("es-AR")}`
}

function formatUSD(n: number): string {
  return `USD ${Math.round(n).toLocaleString("es-AR")}`
}

export function CalculadoraCuotas({
  precio,
  moneda,
  financiacion = [],
}: CalculadoraCuotasProps) {
  // Modalidad: propia (12 max, 5% mensual) vs tarjeta (24 max, 34% TNA)
  const [modalidadId, setModalidadId] = useState<ModalidadFinanciacion>("tarjeta")
  const modalidad = MODALIDADES_FINANCIACION[modalidadId]

  // Default: anticipo mínimo de la modalidad (0% tarjeta, 50% propia)
  const [anticipoPct, setAnticipoPct] = useState(modalidad.anticipoMinPct)
  // Plazo default = el más largo de la modalidad
  const [plazo, setPlazo] = useState<number>(
    modalidad.plazos[modalidad.plazos.length - 1]
  )

  // Si cambia la modalidad y el plazo actual no existe en la nueva, ajustar
  const plazoValido = modalidad.plazos.includes(plazo)
    ? plazo
    : modalidad.plazos[modalidad.plazos.length - 1]

  // Si cambia la modalidad y el anticipo queda fuera de rango, clampear
  const anticipoPctValido = Math.min(
    modalidad.anticipoMaxPct,
    Math.max(modalidad.anticipoMinPct, anticipoPct)
  )

  // Cambio de modalidad: clampear anticipo al rango nuevo (efecto colateral
  // en render — uso un updater controlado en el onClick del toggle)
  const cambiarModalidad = (nuevaId: ModalidadFinanciacion) => {
    const nueva = MODALIDADES_FINANCIACION[nuevaId]
    setModalidadId(nuevaId)
    setAnticipoPct((curr) =>
      Math.min(nueva.anticipoMaxPct, Math.max(nueva.anticipoMinPct, curr))
    )
    setPlazo((curr) =>
      nueva.plazos.includes(curr)
        ? curr
        : nueva.plazos[nueva.plazos.length - 1]
    )
  }

  const formatear = moneda === "USD" ? formatUSD : formatARS

  // Si hay un plan cargado a mano para el modelo que matchea el plazo y la
  // modalidad es propia con 30% anticipo, usamos esa cuota explícita.
  const planMatch = useMemo(() => {
    if (!financiacion.length) return null
    return financiacion.find(
      (p) =>
        p.plan?.toLowerCase().includes(`${plazoValido} cuotas`) ||
        p.plan?.toLowerCase().includes(`${plazoValido}c`)
    )
  }, [financiacion, plazoValido])

  const calculo = useMemo(() => {
    const anticipo = (precio * anticipoPctValido) / 100
    const aFinanciar = precio - anticipo

    let cuotaCalculada: number
    if (
      modalidadId === "propia" &&
      planMatch?.cuota &&
      anticipoPctValido === modalidad.anticipoMinPct
    ) {
      cuotaCalculada = planMatch.cuota
    } else {
      cuotaCalculada = calcularCuotaFrancesa(
        aFinanciar,
        modalidad.tasaMensual,
        plazoValido
      )
    }

    return {
      anticipo,
      aFinanciar,
      cuota: cuotaCalculada,
      total: anticipo + cuotaCalculada * plazoValido,
    }
  }, [precio, anticipoPctValido, plazoValido, planMatch, modalidad, modalidadId])

  return (
    <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-9 rounded-full bg-[#6B4F7A]/10 flex items-center justify-center">
          <Calculator className="size-4 text-[#6B4F7A]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
            Calculá tu cuota
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Simulación rápida y orientativa
          </p>
        </div>
      </div>

      {/* Toggle modalidad */}
      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {(Object.values(MODALIDADES_FINANCIACION)).map((mod) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => cambiarModalidad(mod.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors text-left ${
              modalidadId === mod.id
                ? "border-[#6B4F7A] bg-[#6B4F7A] text-white"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:border-[#6B4F7A]"
            }`}
          >
            <span className="block leading-tight">{mod.label}</span>
            <span
              className={`block text-[10px] leading-tight mt-0.5 ${
                modalidadId === mod.id
                  ? "text-white/80"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {mod.detalle}
            </span>
          </button>
        ))}
      </div>

      {/* Anticipo (rango depende de la modalidad) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Anticipo
          </label>
          <span className="text-xs font-bold text-[#6B4F7A]">
            {anticipoPctValido}% · {formatear(calculo.anticipo)}
          </span>
        </div>
        <input
          type="range"
          min={modalidad.anticipoMinPct}
          max={modalidad.anticipoMaxPct}
          step={1}
          value={anticipoPctValido}
          onChange={(e) => setAnticipoPct(Number(e.target.value))}
          className="w-full accent-[#6B4F7A]"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{modalidad.anticipoMinPct}%</span>
          <span>
            {Math.round((modalidad.anticipoMinPct + modalidad.anticipoMaxPct) / 2)}%
          </span>
          <span>{modalidad.anticipoMaxPct}%</span>
        </div>
        {modalidad.anticipoMinPct > 0 && (
          <p className="text-[10px] text-gray-400 italic">
            Anticipo mínimo {modalidad.anticipoMinPct}% para
            {" "}{modalidad.label.toLowerCase()}
          </p>
        )}
      </div>

      {/* Plazo */}
      <div className="mt-5 space-y-2">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
          Plazo en cuotas
        </label>
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${modalidad.plazos.length}, minmax(0, 1fr))`,
          }}
        >
          {modalidad.plazos.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlazo(p)}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                plazoValido === p
                  ? "border-[#6B4F7A] bg-[#6B4F7A] text-white"
                  : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 hover:border-[#6B4F7A]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado */}
      <div className="mt-5 rounded-lg bg-[#6B4F7A]/5 border border-[#6B4F7A]/10 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Cuota mensual ({modalidad.label.toLowerCase()})
        </p>
        <p className="mt-1 text-2xl font-extrabold text-[#6B4F7A]">
          {formatear(calculo.cuota)}
        </p>
        <div className="mt-3 pt-3 border-t border-[#6B4F7A]/10 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-500 dark:text-gray-400">A financiar</p>
            <p className="font-semibold text-[#1A1A1A] dark:text-white">
              {formatear(calculo.aFinanciar)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Total estimado</p>
            <p className="font-semibold text-[#1A1A1A] dark:text-white">
              {formatear(calculo.total)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
        Los valores son orientativos y pueden variar según el plan elegido y la
        aprobación crediticia. Consultanos por WhatsApp para tu plan
        personalizado.
      </p>
    </div>
  )
}

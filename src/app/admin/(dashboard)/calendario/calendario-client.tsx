"use client"

import { useState } from "react"
import Link from "next/link"

type Evento = {
  id: string
  fecha: Date | string
  tipo: "TURNO" | "OT" | "CUOTA"
  titulo: string
  subtitulo: string
  href: string
  estado?: string
}

const TIPO_COLOR = {
  TURNO: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300",
  OT: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300",
  CUOTA: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300",
} as const

const TIPO_DOT = {
  TURNO: "bg-orange-500",
  OT: "bg-emerald-500",
  CUOTA: "bg-red-500",
} as const

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function CalendarioMes({
  year,
  month,
  eventos,
}: {
  year: number
  month: number // 0-11
  eventos: Evento[]
}) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null)

  // Construir grilla del mes (semanas Lun-Dom)
  const primerDia = new Date(year, month, 1)
  const ultimoDia = new Date(year, month + 1, 0)
  const diasEnMes = ultimoDia.getDate()
  // getDay(): 0=Dom, 1=Lun. Convertir a Lun=0...Dom=6
  const offsetInicial = (primerDia.getDay() + 6) % 7

  const hoy = new Date()
  const hoyKey =
    hoy.getFullYear() === year && hoy.getMonth() === month
      ? hoy.getDate()
      : -1

  // Agrupar eventos por dia
  const eventosPorDia = new Map<number, Evento[]>()
  for (const ev of eventos) {
    const f = new Date(ev.fecha)
    if (f.getFullYear() === year && f.getMonth() === month) {
      const d = f.getDate()
      if (!eventosPorDia.has(d)) eventosPorDia.set(d, [])
      eventosPorDia.get(d)!.push(ev)
    }
  }

  // Construir array de celdas (con offset y días)
  const celdas: ({ dia: number } | null)[] = []
  for (let i = 0; i < offsetInicial; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push({ dia: d })
  // Padding al final hasta que la grilla sea múltiplo de 7
  while (celdas.length % 7 !== 0) celdas.push(null)

  const eventosDelDia =
    diaSeleccionado != null ? eventosPorDia.get(diaSeleccionado) || [] : []

  return (
    <>
      <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        {/* Header con días de la semana */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Grilla de días */}
        <div className="grid grid-cols-7 grid-rows-6 auto-rows-fr">
          {celdas.map((c, i) => {
            if (!c) {
              return (
                <div
                  key={i}
                  className="border-b border-r border-gray-50 dark:border-neutral-900 bg-gray-50/50 dark:bg-neutral-900 min-h-[100px]"
                />
              )
            }
            const evs = eventosPorDia.get(c.dia) || []
            const esHoy = c.dia === hoyKey
            const esFinDeSemana = i % 7 >= 5
            return (
              <button
                key={i}
                onClick={() => setDiaSeleccionado(c.dia)}
                className={`text-left border-b border-r border-gray-50 dark:border-neutral-900 last:border-r-0 p-1.5 min-h-[100px] hover:bg-[#7C3AED]/5 transition-colors ${
                  esFinDeSemana ? "bg-gray-50/30 dark:bg-neutral-900/50" : ""
                } ${esHoy ? "ring-2 ring-[#7C3AED] ring-inset z-10 relative" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center size-6 text-xs ${
                      esHoy
                        ? "bg-[#7C3AED] text-white rounded-full font-bold"
                        : "text-gray-700 dark:text-gray-300 font-semibold"
                    }`}
                  >
                    {c.dia}
                  </span>
                  {evs.length > 0 && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {evs.length}
                    </span>
                  )}
                </div>
                {/* Mini eventos (max 3 visibles) */}
                <div className="mt-1 space-y-0.5">
                  {evs.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5 border ${TIPO_COLOR[ev.tipo]}`}
                    >
                      <span className={`size-1.5 rounded-full ${TIPO_DOT[ev.tipo]} shrink-0`} />
                      <span className="truncate">{ev.titulo}</span>
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                      + {evs.length - 3} más
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Modal del día seleccionado */}
      {diaSeleccionado != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiaSeleccionado(null)
          }}
        >
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 className="text-lg font-bold capitalize">
                {new Intl.DateTimeFormat("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date(year, month, diaSeleccionado))}
              </h2>
              <button
                onClick={() => setDiaSeleccionado(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 text-xl leading-none px-2"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              {eventosDelDia.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  Sin eventos para este día.
                </p>
              ) : (
                eventosDelDia.map((ev) => (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    onClick={() => setDiaSeleccionado(null)}
                    className={`block rounded-lg border p-3 hover:shadow-sm transition-shadow ${TIPO_COLOR[ev.tipo]}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`size-2 rounded-full ${TIPO_DOT[ev.tipo]}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {ev.tipo === "TURNO" ? "Turno" : ev.tipo === "OT" ? "Entrega de OT" : "Vencimiento de cuota"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{ev.titulo}</p>
                    <p className="text-xs opacity-80">{ev.subtitulo}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

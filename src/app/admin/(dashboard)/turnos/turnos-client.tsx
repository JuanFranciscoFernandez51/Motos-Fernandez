"use client"

import { useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, Ban, Phone, Calendar, CheckCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type Turno = {
  id: string
  nombre: string
  email: string | null
  telefono: string
  modeloMoto: string | null
  modelo: { nombre: string } | null
  tipoServicio: string
  fechaPreferida: string | null
  fechaConfirmada: string | null
  estado: string
  createdAt: string
}

type DiaBloqueado = {
  id: string
  fecha: string
  motivo: string | null
}

type Props = {
  turnos: Turno[]
  diasBloqueados: DiaBloqueado[]
  pendientes: number
  confirmadosHoy: number
  totalMes: number
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE:  { label: "Pendiente",  color: "text-yellow-700", bg: "bg-yellow-100" },
  CONFIRMADO: { label: "Confirmado", color: "text-green-700",  bg: "bg-green-100"  },
  COMPLETADO: { label: "Completado", color: "text-blue-700",   bg: "bg-blue-100"   },
  CANCELADO:  { label: "Cancelado",  color: "text-red-700",    bg: "bg-red-100"    },
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function toLocalDateStr(date: Date) {
  // YYYY-MM-DD in local time
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function TurnosClient({ turnos: initialTurnos, diasBloqueados: initialBloqueados, pendientes, confirmadosHoy, totalMes }: Props) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [bloqueados, setBloqueados] = useState<DiaBloqueado[]>(initialBloqueados)
  const [turnos, setTurnos] = useState<Turno[]>(initialTurnos)
  const [loadingFecha, setLoadingFecha] = useState<string | null>(null)
  const [loadingTurno, setLoadingTurno] = useState<string | null>(null)

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1)
  // Monday=0 offset
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  // Map of date string -> turno count for this month
  const turnosByDate: Record<string, number> = {}
  for (const t of turnos) {
    const d = t.fechaPreferida || t.fechaConfirmada
    if (d) {
      const key = d.slice(0, 10)
      turnosByDate[key] = (turnosByDate[key] || 0) + 1
    }
  }

  const bloqueadosSet = new Set(bloqueados.map(b => b.fecha.slice(0, 10)))

  const toggleBloqueo = useCallback(async (dateStr: string) => {
    setLoadingFecha(dateStr)
    try {
      if (bloqueadosSet.has(dateStr)) {
        await fetch(`/api/admin/turnos/bloqueados?fecha=${dateStr}T03:00:00.000Z`, { method: "DELETE" })
        setBloqueados(prev => prev.filter(b => b.fecha.slice(0, 10) !== dateStr))
      } else {
        const res = await fetch("/api/admin/turnos/bloqueados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fecha: `${dateStr}T03:00:00.000Z` }),
        })
        const data = await res.json()
        setBloqueados(prev => [...prev, data])
      }
    } finally {
      setLoadingFecha(null)
    }
  }, [bloqueadosSet])

  const cambiarEstado = useCallback(async (id: string, estado: string) => {
    setLoadingTurno(id)
    try {
      await fetch(`/api/admin/turnos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      })
      setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado } : t))
    } finally {
      setLoadingTurno(null)
    }
  }, [])

  const turnosFiltrados = filtroEstado
    ? turnos.filter(t => t.estado === filtroEstado)
    : turnos

  const todayStr = toLocalDateStr(today)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Turnos de Servicio Técnico</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de turnos del taller</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendientes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{confirmadosHoy}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Confirmados hoy</p>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-xl border p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F0EBF4] flex items-center justify-center">
            <Calendar className="h-5 w-5 text-[#6B4F7A]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalMes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total este mes</p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 min-w-[160px] text-center">
              {MESES[currentMonth]} {currentYear}
            </h2>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Ban className="h-3 w-3 text-red-400" />
            Click en un día para bloquear/desbloquear
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isToday = dateStr === todayStr
            const isBloqueado = bloqueadosSet.has(dateStr)
            const turnoCount = turnosByDate[dateStr] || 0
            const isLoading = loadingFecha === dateStr

            return (
              <button
                key={day}
                onClick={() => toggleBloqueo(dateStr)}
                disabled={isLoading}
                className={`relative rounded-lg p-1.5 text-sm text-center transition-colors min-h-[44px] flex flex-col items-center justify-start pt-2
                  ${isBloqueado ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50 dark:hover:bg-neutral-900"}
                  ${isToday ? "ring-2 ring-[#6B4F7A]" : ""}
                  ${isLoading ? "opacity-50" : ""}
                `}
              >
                <span className={`text-sm font-medium leading-none
                  ${isBloqueado ? "text-red-500" : isToday ? "text-[#6B4F7A] font-bold" : "text-gray-700 dark:text-gray-300"}
                `}>
                  {day}
                </span>
                {isBloqueado && (
                  <span className="text-[9px] text-red-400 mt-0.5 leading-none">Bloqueado</span>
                )}
                {turnoCount > 0 && !isBloqueado && (
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#6B4F7A] inline-block" />
                )}
              </button>
            )
          })}
        </div>

        {/* Días bloqueados tags */}
        {bloqueados.length > 0 && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Días bloqueados:</span>
            {bloqueados
              .sort((a, b) => a.fecha.localeCompare(b.fecha))
              .map(b => {
                const d = new Date(b.fecha)
                const label = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
                return (
                  <span key={b.id} className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    {label}
                    <button
                      onClick={() => toggleBloqueo(b.fecha.slice(0, 10))}
                      className="hover:text-red-900 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
          </div>
        )}
      </div>

      {/* Turnos list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Todos los turnos
          </h2>
          <div className="flex gap-1">
            {[null, "PENDIENTE", "CONFIRMADO", "COMPLETADO", "CANCELADO"].map(estado => (
              <button
                key={estado ?? "todos"}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filtroEstado === estado
                    ? "bg-[#6B4F7A] text-white border-[#6B4F7A]"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-900"
                }`}
              >
                {estado ? ESTADO_CONFIG[estado]?.label : "Todos"}
              </button>
            ))}
          </div>
        </div>

        {turnosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border p-10 text-center text-gray-400">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No hay turnos {filtroEstado ? `con estado "${ESTADO_CONFIG[filtroEstado]?.label}"` : ""}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {turnosFiltrados.map(turno => {
              const cfg = ESTADO_CONFIG[turno.estado]
              return (
                <div key={turno.id} className="bg-white dark:bg-neutral-900 rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{turno.nombre}</p>
                      {turno.email && <p className="text-xs text-gray-400">{turno.email}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.bg} ${cfg?.color}`}>
                      {cfg?.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                    <a
                      href={`https://wa.me/${turno.telefono.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#6B4F7A] hover:underline w-fit"
                    >
                      <Phone className="h-3 w-3" />
                      {turno.telefono}
                    </a>
                    <span className="flex items-center gap-1">
                      🔧 {turno.modelo?.nombre || turno.modeloMoto || "Moto"} — {turno.tipoServicio}
                    </span>
                    {(turno.fechaPreferida || turno.fechaConfirmada) && (
                      <span className="flex items-center gap-1">
                        📅 {turno.fechaConfirmada
                          ? new Date(turno.fechaConfirmada).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
                          : new Date(turno.fechaPreferida!).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
                        }
                        {turno.fechaConfirmada && <span className="text-green-600 font-medium ml-1">(confirmado)</span>}
                      </span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {turno.estado === "PENDIENTE" && (
                      <>
                        <button
                          onClick={() => cambiarEstado(turno.id, "CONFIRMADO")}
                          disabled={loadingTurno === turno.id}
                          className="px-3 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => cambiarEstado(turno.id, "CANCELADO")}
                          disabled={loadingTurno === turno.id}
                          className="px-3 py-1 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    {turno.estado === "CONFIRMADO" && (
                      <button
                        onClick={() => cambiarEstado(turno.id, "COMPLETADO")}
                        disabled={loadingTurno === turno.id}
                        className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        Completar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MessageCircleHeart,
  Wrench,
  Star,
  Send,
  X,
  Check,
  RotateCw,
  Edit3,
  Loader2,
  Phone,
  FileText,
  PlayCircle,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { getWhatsAppUrlForClient } from "@/lib/constants"

export type TipoOutreachUI =
  | "SERVICE_POSTVENTA"
  | "NPS"
  | "CUOTA_PROXIMA"
  | "CUOTA_VENCIDA"

export type OutreachTareaUI = {
  id: string
  tipo: TipoOutreachUI
  estado: "PROGRAMADA" | "ENVIADA" | "DESCARTADA" | "RESPONDIDA"
  cliente: {
    id: string
    nombre: string
    apellido: string
    telefono: string
  }
  oc: {
    id: string
    numero: number
    motoDescripcion: string
    fecha: string
  } | null
  mensaje: string
  respuesta: string | null
  notaInterna: string | null
  fechaProgramada: string
  enviadaAt: string | null
  descartadaAt: string | null
  createdAt: string
}

const TIPO_CONFIG = {
  SERVICE_POSTVENTA: {
    label: "Service",
    color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    icon: Wrench,
  },
  NPS: {
    label: "NPS",
    color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    icon: Star,
  },
  CUOTA_PROXIMA: {
    label: "Cuota próxima",
    color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    icon: Clock,
  },
  CUOTA_VENCIDA: {
    label: "Cuota vencida",
    color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    icon: AlertTriangle,
  },
} as const

const ESTADO_CONFIG = {
  PROGRAMADA: { label: "Pendiente", color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  ENVIADA: { label: "Enviada", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  DESCARTADA: { label: "Descartada", color: "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300" },
  RESPONDIDA: { label: "Respondida", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
} as const

type Filtro = "PENDIENTES" | "TODAS" | "ENVIADAS" | "DESCARTADAS"

export function OutreachClient({ tareas }: { tareas: OutreachTareaUI[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>("PENDIENTES")
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | TipoOutreachUI>("TODOS")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mensajeEdit, setMensajeEdit] = useState("")
  const [generando, setGenerando] = useState(false)
  const [generadoMsg, setGenerado] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    return tareas.filter((t) => {
      if (filtro === "PENDIENTES" && t.estado !== "PROGRAMADA") return false
      if (filtro === "ENVIADAS" && t.estado !== "ENVIADA" && t.estado !== "RESPONDIDA")
        return false
      if (filtro === "DESCARTADAS" && t.estado !== "DESCARTADA") return false
      if (tipoFiltro !== "TODOS" && t.tipo !== tipoFiltro) return false
      return true
    })
  }, [tareas, filtro, tipoFiltro])

  const counts = useMemo(
    () => ({
      pendientes: tareas.filter((t) => t.estado === "PROGRAMADA").length,
      enviadas: tareas.filter((t) => t.estado === "ENVIADA" || t.estado === "RESPONDIDA").length,
      descartadas: tareas.filter((t) => t.estado === "DESCARTADA").length,
      total: tareas.length,
    }),
    [tareas]
  )

  const accion = useCallback(
    async (id: string, accion: string, body: Record<string, unknown> = {}) => {
      setLoadingId(id)
      try {
        const res = await fetch(`/api/admin/outreach/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion, ...body }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          alert(data.error || `Error ${res.status}`)
        } else {
          router.refresh()
        }
      } finally {
        setLoadingId(null)
      }
    },
    [router]
  )

  const generarManual = async () => {
    setGenerando(true)
    setGenerado(null)
    try {
      const res = await fetch("/api/admin/jobs/run/generar-outreach", {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGenerado(`Error: ${data.error || `HTTP ${res.status}`}`)
      } else {
        setGenerado(
          `Listo. ${data.total ?? 0} tareas nuevas (${data.nps ?? 0} NPS + ${data.service ?? 0} service).`
        )
        router.refresh()
      }
    } catch (e) {
      setGenerado(`Error: ${e instanceof Error ? e.message : "Error"}`)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageCircleHeart className="size-6 text-[#7C3AED]" />
            Outreach
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cola de WhatsApps a clientes: service post-venta + encuestas NPS. Las
            tareas se generan solas a partir de OCs concretadas.
          </p>
        </div>
        <button
          type="button"
          onClick={generarManual}
          disabled={generando}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 px-3 py-2 text-sm font-medium disabled:opacity-50"
          title="Corre el cron manualmente. Sirve para revisar si hay OCs nuevas que califican."
        >
          {generando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlayCircle className="size-4" />
          )}
          Buscar nuevas tareas
        </button>
      </div>

      {generadoMsg && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 px-3 py-2 text-sm">
          {generadoMsg}
        </div>
      )}

      {/* Tabs de filtro */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(
          [
            { key: "PENDIENTES", label: "Pendientes", count: counts.pendientes, color: "yellow" },
            { key: "ENVIADAS", label: "Enviadas", count: counts.enviadas, color: "green" },
            { key: "DESCARTADAS", label: "Descartadas", count: counts.descartadas, color: "gray" },
            { key: "TODAS", label: "Todas", count: counts.total, color: "purple" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFiltro(tab.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filtro === tab.key
                ? "border-[#7C3AED] bg-[#7C3AED]/5"
                : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {tab.label}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {tab.count}
            </p>
          </button>
        ))}
      </div>

      {/* Filtro tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Tipo:</span>
        {([
          { key: "TODOS", label: "Todos" },
          { key: "SERVICE_POSTVENTA", label: "Service" },
          { key: "NPS", label: "NPS" },
          { key: "CUOTA_PROXIMA", label: "Cuotas próximas" },
          { key: "CUOTA_VENCIDA", label: "Cuotas vencidas" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTipoFiltro(t.key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              tipoFiltro === t.key
                ? "bg-[#7C3AED] text-white border-[#7C3AED]"
                : "hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de tareas */}
      {filtradas.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border p-10 text-center text-gray-400">
          <MessageCircleHeart className="size-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">
            {filtro === "PENDIENTES"
              ? "No hay tareas pendientes — todo el outreach está al día"
              : "Sin tareas en este filtro"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((t) => {
            const cfg = TIPO_CONFIG[t.tipo]
            const ecfg = ESTADO_CONFIG[t.estado]
            const Icon = cfg.icon
            const tieneTel = t.cliente.telefono && t.cliente.telefono.trim().length > 0
            const editando = editandoId === t.id
            return (
              <div
                key={t.id}
                className="bg-white dark:bg-neutral-900 rounded-xl border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <Icon className="size-3" />
                        {cfg.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ecfg.color}`}>
                        {ecfg.label}
                      </span>
                      {t.oc && (
                        <Link
                          href={`/admin/ordenes-compra/${t.oc.id}`}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#7C3AED]"
                        >
                          <FileText className="size-3" />
                          OC-{String(t.oc.numero).padStart(4, "0")}
                        </Link>
                      )}
                    </div>
                    <Link
                      href={`/admin/clientes/${t.cliente.id}`}
                      className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-[#7C3AED]"
                    >
                      {t.cliente.apellido}, {t.cliente.nombre}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                      {tieneTel ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {t.cliente.telefono}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-300">
                          ⚠ Sin teléfono
                        </span>
                      )}
                      {t.oc && (
                        <span>
                          {t.oc.motoDescripcion} — comprada el{" "}
                          {new Date(t.oc.fecha).toLocaleDateString("es-AR")}
                        </span>
                      )}
                      {t.enviadaAt && (
                        <span className="text-green-700 dark:text-green-300">
                          Enviada {new Date(t.enviadaAt).toLocaleDateString("es-AR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mensaje (editable) */}
                {editando ? (
                  <div className="space-y-2">
                    <textarea
                      value={mensajeEdit}
                      onChange={(e) => setMensajeEdit(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#7C3AED] outline-none font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await accion(t.id, "editarMensaje", { mensaje: mensajeEdit })
                          setEditandoId(null)
                        }}
                        disabled={loadingId === t.id}
                        className="px-3 py-1 text-xs rounded-md bg-[#7C3AED] hover:bg-[#9D5CF0] text-white"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        className="px-3 py-1 text-xs rounded-md border border-gray-200 dark:border-neutral-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {t.mensaje}
                  </div>
                )}

                {/* Acciones */}
                {!editando && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.estado === "PROGRAMADA" && (
                      <>
                        {tieneTel && (
                          <a
                            href={getWhatsAppUrlForClient(t.cliente.telefono, t.mensaje)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => accion(t.id, "enviada")}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm font-medium"
                          >
                            <Send className="size-3.5" />
                            Abrir WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoId(t.id)
                            setMensajeEdit(t.mensaje)
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                        >
                          <Edit3 className="size-3" />
                          Editar texto
                        </button>
                        <button
                          type="button"
                          onClick={() => accion(t.id, "enviada")}
                          disabled={loadingId === t.id}
                          className="inline-flex items-center gap-1 rounded-md border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-2.5 py-1.5 text-xs hover:bg-green-100"
                          title="Marcar como enviada (sin abrir WhatsApp)"
                        >
                          <Check className="size-3" />
                          Ya envié
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Descartar esta tarea?")) accion(t.id, "descartada")
                          }}
                          disabled={loadingId === t.id}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                        >
                          <X className="size-3" />
                          Descartar
                        </button>
                      </>
                    )}
                    {t.estado === "ENVIADA" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const resp = prompt("¿Qué respondió el cliente?")
                            if (resp) accion(t.id, "respondida", { respuesta: resp })
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2.5 py-1.5 text-xs"
                        >
                          <MessageCircleHeart className="size-3" />
                          Anotar respuesta
                        </button>
                        <button
                          type="button"
                          onClick={() => accion(t.id, "reprogramar")}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                          title="Volver a pendientes (si te confundiste al marcar)"
                        >
                          <RotateCw className="size-3" />
                          Volver a pendiente
                        </button>
                      </>
                    )}
                    {(t.estado === "DESCARTADA" || t.estado === "RESPONDIDA") && (
                      <button
                        type="button"
                        onClick={() => accion(t.id, "reprogramar")}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800"
                      >
                        <RotateCw className="size-3" />
                        Reactivar
                      </button>
                    )}
                  </div>
                )}

                {/* Respuesta (si la hay) */}
                {t.respuesta && (
                  <div className="rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 px-3 py-2 text-xs text-purple-900 dark:text-purple-200">
                    <strong>Respuesta:</strong> {t.respuesta}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

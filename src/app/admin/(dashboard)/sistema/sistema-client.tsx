"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  XCircle,
  PlayCircle,
  Loader2,
  Clock,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"

export type JobInfo = {
  key: string
  titulo: string
  descripcion: string
  cron: string
  cronDescripcion: string
  envVars: string[]
}

export type JobLogClient = {
  id: string
  ok: boolean
  message: string | null
  durationMs: number | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

type JobConLogs = JobInfo & { logs: JobLogClient[] }

type EnvCheck = Record<string, boolean>

export function SistemaClient({
  jobs,
  envCheck,
  sheetUrl,
}: {
  jobs: JobConLogs[]
  envCheck: EnvCheck
  sheetUrl: string | null
}) {
  const router = useRouter()
  const [runningJob, setRunningJob] = useState<string | null>(null)
  const [resultadoJob, setResultadoJob] = useState<
    Record<string, { ok: boolean; message: string }>
  >({})

  const ejecutarJob = async (key: string) => {
    setRunningJob(key)
    setResultadoJob((prev) => ({ ...prev, [key]: { ok: false, message: "" } }))
    try {
      const res = await fetch(`/api/admin/jobs/run/${key}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResultadoJob((prev) => ({
          ...prev,
          [key]: {
            ok: false,
            message: data.error || `HTTP ${res.status}`,
          },
        }))
      } else {
        setResultadoJob((prev) => ({
          ...prev,
          [key]: {
            ok: true,
            message: data.message || resumenResultado(data),
          },
        }))
        router.refresh()
      }
    } catch (e) {
      setResultadoJob((prev) => ({
        ...prev,
        [key]: {
          ok: false,
          message: e instanceof Error ? e.message : "Error",
        },
      }))
    } finally {
      setRunningJob(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Sistema y tareas automáticas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Estado de los crons, últimas ejecuciones y disparador manual.
        </p>
      </div>

      {/* Diagnóstico de env vars */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Variables de entorno
          </h2>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#6B4F7A] hover:underline"
            >
              Ver Google Sheet de backup <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(envCheck).map(([k, v]) => (
            <div
              key={k}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                v
                  ? "border-green-200 dark:border-green-900/40 bg-green-50/40 dark:bg-green-950/20"
                  : "border-amber-300 bg-amber-50/40 dark:bg-amber-950/20"
              }`}
              title={
                v
                  ? "Configurada"
                  : "Falta — configurala en Vercel (Settings → Environment Variables)"
              }
            >
              {v ? (
                <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-300 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
              )}
              <span className="font-mono truncate">{k}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          ✓ verde = configurada. <span className="text-amber-600">⚠ ámbar</span> = falta en
          Vercel — el cron que la necesita va a fallar hasta que la agregues.
        </p>
      </div>

      {/* Cards por job */}
      <div className="space-y-4">
        {jobs.map((j) => {
          const ultimo = j.logs[0]
          const corriendo = runningJob === j.key
          const resultadoMan = resultadoJob[j.key]

          return (
            <div
              key={j.key}
              className="rounded-xl border bg-white dark:bg-neutral-900 p-5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {j.titulo}
                    </h3>
                    {ultimo ? (
                      <EstadoBadge ok={ultimo.ok} />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                        Sin ejecutar
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {j.descripcion}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {j.cronDescripcion}
                    </span>
                    <span className="font-mono bg-gray-50 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                      {j.cron}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => ejecutarJob(j.key)}
                  disabled={corriendo}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {corriendo ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlayCircle className="size-4" />
                  )}
                  {corriendo ? "Ejecutando..." : "Ejecutar ahora"}
                </button>
              </div>

              {/* Mensaje de resultado de ejecución manual */}
              {resultadoMan && resultadoMan.message && (
                <div
                  className={`mt-3 rounded-md px-3 py-2 text-sm ${
                    resultadoMan.ok
                      ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-900/40"
                      : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/40"
                  }`}
                >
                  {resultadoMan.message}
                </div>
              )}

              {/* Historial */}
              {j.logs.length > 0 && (
                <details className="mt-3 group">
                  <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                    Historial ({j.logs.length} {j.logs.length === 1 ? "ejecución" : "ejecuciones"})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {j.logs.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-gray-100 dark:border-neutral-800"
                      >
                        {l.ok ? (
                          <CheckCircle2 className="size-3 text-green-600 dark:text-green-300 shrink-0" />
                        ) : (
                          <XCircle className="size-3 text-red-600 dark:text-red-300 shrink-0" />
                        )}
                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {l.durationMs != null && (
                          <span className="text-gray-400 whitespace-nowrap">
                            {(l.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                          {l.ok
                            ? resumenMetadata(l.metadata)
                            : l.message || "Error sin mensaje"}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Env vars que requiere el job */}
              <details className="mt-3">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                  Variables que necesita ({j.envVars.length})
                </summary>
                <ul className="mt-1 space-y-0.5 text-[11px] font-mono text-gray-500 dark:text-gray-400">
                  {j.envVars.map((v) => (
                    <li key={v}>• {v}</li>
                  ))}
                </ul>
              </details>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EstadoBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
      <CheckCircle2 className="size-3" />
      OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
      <XCircle className="size-3" />
      Error
    </span>
  )
}

function resumenMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "OK"
  const partes: string[] = []
  if (typeof metadata.sizeKB === "number") partes.push(`${metadata.sizeKB} KB`)
  if (typeof metadata.totalFilas === "number")
    partes.push(`${metadata.totalFilas} filas`)
  if (typeof metadata.pestanias === "number")
    partes.push(`${metadata.pestanias} pestañas`)
  if (typeof metadata.inconsistencias === "number")
    partes.push(`${metadata.inconsistencias} inconsistencias`)
  if (typeof metadata.total === "number" && typeof metadata.nps === "number") {
    partes.push(`${metadata.total} tareas (${metadata.nps} NPS + ${metadata.service ?? 0} service)`)
  }
  return partes.length > 0 ? partes.join(" · ") : "OK"
}

function resumenResultado(data: Record<string, unknown>): string {
  if (typeof data.message === "string") return data.message
  if (data.sizeKB != null) return `Backup OK · ${data.sizeKB} KB`
  if (data.pestanias != null && Array.isArray(data.pestanias))
    return `Sheets actualizado · ${(data.pestanias as unknown[]).length} pestañas`
  if (typeof data.inconsistencias === "number")
    return `${data.inconsistencias} inconsistencias detectadas`
  if (typeof data.total === "number")
    return `${data.total} tareas de outreach generadas`
  return "OK"
}

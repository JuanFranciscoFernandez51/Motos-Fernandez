"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
  Sparkles,
  Bike,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { InstagramIcon, FacebookIcon } from "@/components/icons/social"
import { formatMoney } from "@/lib/admin-helpers"
import { VideoUpload } from "@/components/admin/video-upload"

/**
 * Vista de calendario de publicaciones programadas. Iteración 1: lista
 * agrupada por día + modal de creación. Drag-and-drop sobre vista mes
 * queda para iteración 2 (más complejo, no bloquea el feature).
 */

type MotoLite = {
  id: string
  slug: string
  marca: string
  nombre: string
  anio: number | null
  condicion: string
  precio: number | null
  moneda: string
  fotoPrincipal: string | null
}

type PostLite = {
  id: string
  status: string
  platforms: string[]
  scheduledAt: string
  publishedAt: string | null
  customCaption: string | null
  errorMessage: string | null
  retryCount: number
  publishedRefs: Record<string, unknown> | null
  moto: {
    id: string
    slug: string
    marca: string
    nombre: string
    fotoPrincipal: string | null
  }
}

const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Programado",
    bg: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
    icon: Clock,
  },
  PROCESSING: {
    label: "Publicando…",
    bg: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200",
    icon: Loader2,
  },
  PUBLISHED: {
    label: "Publicado",
    bg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  PARTIAL: {
    label: "Parcial",
    bg: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200",
    icon: AlertTriangle,
  },
  FAILED: {
    label: "Falló",
    bg: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Cancelado",
    bg: "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400",
    icon: XCircle,
  },
}

function fmtFechaCorta(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  })
}

function fmtHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

/** Devuelve YYYY-MM-DD para agrupar (hora de Argentina, no UTC). */
function diaKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

export function CalendarioClient({
  motos,
  posts: postsInicial,
  featureEnabled,
}: {
  motos: MotoLite[]
  posts: PostLite[]
  featureEnabled: boolean
}) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)

  // Agrupar posts por día (en hora AR)
  const grupos = useMemo(() => {
    const map = new Map<string, PostLite[]>()
    for (const p of postsInicial) {
      const k = diaKey(p.scheduledAt)
      const arr = map.get(k) || []
      arr.push(p)
      map.set(k, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
  }, [postsInicial])

  const fallidos = postsInicial.filter((p) => p.status === "FAILED")

  const handleCancel = (id: string) => {
    if (!window.confirm("¿Cancelar este post programado?")) return
    setCancelandoId(id)
    startTransition(async () => {
      const res = await fetch(`/api/admin/meta/scheduled/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `Error ${res.status}`)
      }
      setCancelandoId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/admin/meta" />}
              className="-ml-2"
            >
              <ArrowLeft className="size-4 mr-1" />
              Volver
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarPlus className="size-6 text-[#7C3AED]" />
            Calendario de publicaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Programá posts a IG y FB. El cron los publica automáticamente
            a la hora indicada (zona horaria Argentina).
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
          disabled={!featureEnabled}
          title={
            !featureEnabled
              ? "Feature flag FEATURE_SCHEDULED_POSTS_ENABLED no está prendido en Vercel"
              : ""
          }
        >
          <CalendarPlus className="size-4 mr-1.5" />
          Programar publicación
        </Button>
      </div>

      {/* Feature flag warning */}
      {!featureEnabled && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Feature flag apagado
              </p>
              <p className="text-amber-800 dark:text-amber-300 mt-1">
                Para activar el cron de publicación automática, seteá en
                Vercel la env var{" "}
                <code className="bg-amber-200/50 dark:bg-amber-900/40 px-1 rounded">
                  FEATURE_SCHEDULED_POSTS_ENABLED=true
                </code>{" "}
                y redeploy. Mientras tanto podés navegar la UI pero no
                programar ni se ejecutará el cron.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner fallidos */}
      {fallidos.length > 0 && (
        <Card className="border-red-200 bg-red-50/40 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircle className="size-5 text-red-600 dark:text-red-300 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-red-800 dark:text-red-300">
                {fallidos.length} post{fallidos.length === 1 ? "" : "s"} fallaron
              </p>
              <p className="text-red-700 dark:text-red-400 mt-1">
                Revisá el detalle abajo. Causas comunes: token vencido,
                fotos con formato no soportado, moto vendida después de
                programar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista por día */}
      {grupos.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500 dark:text-gray-400">
            <Sparkles className="size-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Todavía no hay publicaciones programadas. Tocá &quot;Programar
              publicación&quot; para crear la primera.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map(([fechaKey, items]) => (
            <div key={fechaKey}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mb-2">
                {fmtFechaCorta(items[0].scheduledAt)}
              </p>
              <div className="space-y-2">
                {items.map((p) => {
                  const styles = STATUS_STYLES[p.status] || STATUS_STYLES.PENDING
                  const Icon = styles.icon
                  return (
                    <Card key={p.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {p.moto.fotoPrincipal ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.moto.fotoPrincipal}
                            alt=""
                            className="size-12 rounded-md object-cover bg-gray-100 dark:bg-neutral-800 shrink-0"
                          />
                        ) : (
                          <div className="size-12 rounded-md bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                            <Bike className="size-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {p.moto.marca} {p.moto.nombre}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.bg}`}
                            >
                              <Icon
                                className={`size-3 ${p.status === "PROCESSING" ? "animate-spin" : ""}`}
                              />
                              {styles.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {fmtHora(p.scheduledAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              {p.platforms.includes("IG") && (
                                <InstagramIcon className="size-3" />
                              )}
                              {p.platforms.includes("FB") && (
                                <FacebookIcon className="size-3" />
                              )}
                            </span>
                            {p.retryCount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">
                                {p.retryCount} reintento
                                {p.retryCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {p.errorMessage && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 truncate">
                              {p.errorMessage}
                            </p>
                          )}
                        </div>
                        {p.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(p.id)}
                            disabled={isPending && cancelandoId === p.id}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Cancelar"
                          >
                            {isPending && cancelandoId === p.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateModal
          motos={motos}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

/**
 * Modal de creación. Iteración 1: form lineal con todos los campos
 * visibles. Cuando tengamos volumen real se puede pasar a wizard.
 */
function CreateModal({
  motos,
  onClose,
  onCreated,
}: {
  motos: MotoLite[]
  onClose: () => void
  onCreated: () => void
}) {
  const [motoId, setMotoId] = useState("")
  const [searchMoto, setSearchMoto] = useState("")
  const [ig, setIg] = useState(true)
  const [fb, setFb] = useState(true)
  // Default: 1 hora desde ahora, redondeado a la próxima hora en punto.
  const defaultDate = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    // input datetime-local quiere "YYYY-MM-DDTHH:mm" en LOCAL time
    const off = d.getTimezoneOffset()
    const local = new Date(d.getTime() - off * 60000)
    return local.toISOString().slice(0, 16)
  }, [])
  const [scheduledAt, setScheduledAt] = useState(defaultDate)
  const [customCaption, setCustomCaption] = useState("")
  const [mediaType, setMediaType] = useState<"PHOTO_CAROUSEL" | "VIDEO" | "REEL">(
    "PHOTO_CAROUSEL"
  )
  const [videoUrl, setVideoUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const motosFiltradas = useMemo(() => {
    const q = searchMoto.trim().toLowerCase()
    if (!q) return motos.slice(0, 50)
    return motos
      .filter((m) =>
        `${m.marca} ${m.nombre} ${m.slug}`.toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [searchMoto, motos])

  const motoSeleccionada = motos.find((m) => m.id === motoId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!motoId) {
      setError("Elegí una moto")
      return
    }
    if (!ig && !fb) {
      setError("Elegí al menos una plataforma (IG o FB)")
      return
    }
    if ((mediaType === "VIDEO" || mediaType === "REEL") && !videoUrl) {
      setError(`Subí un video para programar como ${mediaType}`)
      return
    }
    setSubmitting(true)
    try {
      // datetime-local viene en zona local del browser. JS Date lo
      // interpreta correctamente y al serializar va a ISO/UTC.
      const fechaUTC = new Date(scheduledAt).toISOString()
      const platforms: string[] = []
      if (ig) platforms.push("IG")
      if (fb) platforms.push("FB")
      const res = await fetch("/api/admin/meta/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId,
          platforms,
          scheduledAt: fechaUTC,
          customCaption: customCaption.trim() || null,
          mediaType,
          videoUrls: videoUrl ? [videoUrl] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Programar publicación
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="size-5" />
            </button>
          </div>

          {/* Moto */}
          <div>
            <Label>Moto a publicar *</Label>
            <Input
              value={searchMoto}
              onChange={(e) => setSearchMoto(e.target.value)}
              placeholder="Buscar por marca, modelo o código…"
              className="mb-2"
            />
            <div className="max-h-44 overflow-y-auto rounded-md border border-gray-200 dark:border-neutral-800">
              {motosFiltradas.length === 0 ? (
                <p className="text-xs text-gray-400 p-3 text-center">
                  Sin resultados
                </p>
              ) : (
                motosFiltradas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMotoId(m.id)}
                    className={`w-full text-left p-2 flex items-center gap-2 border-b last:border-b-0 border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 ${motoId === m.id ? "bg-[#7C3AED]/10" : ""}`}
                  >
                    {m.fotoPrincipal ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.fotoPrincipal}
                        alt=""
                        className="size-8 rounded object-cover bg-gray-100 dark:bg-neutral-800 shrink-0"
                      />
                    ) : (
                      <div className="size-8 rounded bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <Bike className="size-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {m.marca} {m.nombre}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {m.condicion} · {m.anio || "—"} ·{" "}
                        {m.precio
                          ? formatMoney(m.precio, m.moneda)
                          : "consultar"}
                      </p>
                    </div>
                    {motoId === m.id && (
                      <CheckCircle2 className="size-4 text-[#7C3AED] shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
            {motoSeleccionada && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Seleccionada: <strong>{motoSeleccionada.marca} {motoSeleccionada.nombre}</strong>
              </p>
            )}
          </div>

          {/* Plataformas */}
          <div>
            <Label>¿Dónde publicar? *</Label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIg(!ig)}
                className={`flex-1 rounded-lg border-2 p-3 transition-colors ${ig ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 dark:border-neutral-800"}`}
              >
                <InstagramIcon className="size-5 mx-auto" />
                <p className="text-xs font-semibold mt-1">Instagram</p>
              </button>
              <button
                type="button"
                onClick={() => setFb(!fb)}
                className={`flex-1 rounded-lg border-2 p-3 transition-colors ${fb ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 dark:border-neutral-800"}`}
              >
                <FacebookIcon className="size-5 mx-auto" />
                <p className="text-xs font-semibold mt-1">Facebook</p>
              </button>
            </div>
          </div>

          {/* Tipo de contenido */}
          <div>
            <Label>Tipo de contenido *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setMediaType("PHOTO_CAROUSEL")}
                className={`rounded-lg border-2 p-2.5 text-xs transition-colors ${mediaType === "PHOTO_CAROUSEL" ? "border-[#7C3AED] bg-[#7C3AED]/5 font-semibold" : "border-gray-200 dark:border-neutral-800"}`}
              >
                📸 Fotos
                <p className="text-[10px] text-gray-500 mt-0.5 font-normal">
                  Carrusel con las fotos del catálogo
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMediaType("VIDEO")}
                className={`rounded-lg border-2 p-2.5 text-xs transition-colors ${mediaType === "VIDEO" ? "border-[#7C3AED] bg-[#7C3AED]/5 font-semibold" : "border-gray-200 dark:border-neutral-800"}`}
              >
                🎬 Video feed
                <p className="text-[10px] text-gray-500 mt-0.5 font-normal">
                  Video al feed (hasta 60 min)
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMediaType("REEL")}
                className={`rounded-lg border-2 p-2.5 text-xs transition-colors ${mediaType === "REEL" ? "border-[#7C3AED] bg-[#7C3AED]/5 font-semibold" : "border-gray-200 dark:border-neutral-800"}`}
              >
                ⚡ Reel
                <p className="text-[10px] text-gray-500 mt-0.5 font-normal">
                  Vertical 9:16, máx 90s
                </p>
              </button>
            </div>
          </div>

          {/* Uploader de video — solo cuando es VIDEO o REEL */}
          {(mediaType === "VIDEO" || mediaType === "REEL") && (
            <div>
              <Label>
                {mediaType === "REEL" ? "Reel" : "Video"} a publicar *
              </Label>
              <VideoUpload
                value={videoUrl}
                onChange={setVideoUrl}
                folder={mediaType === "REEL" ? "reels" : "videos-meta"}
                hint={mediaType === "REEL" ? "REEL" : "VIDEO"}
              />
            </div>
          )}

          {/* Fecha y hora */}
          <div>
            <Label htmlFor="scheduledAt">Fecha y hora (Argentina) *</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Mínimo 5 minutos en el futuro. El cron procesa cada 5 min,
              puede haber pequeñas demoras.
            </p>
          </div>

          {/* Caption */}
          <div>
            <Label htmlFor="caption">Caption personalizado (opcional)</Label>
            <Textarea
              id="caption"
              rows={4}
              maxLength={2200}
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Si lo dejás vacío, se autogenera desde la moto (precio, año, hashtags)."
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 text-right">
              {customCaption.length} / 2200
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <CalendarPlus className="size-4 mr-2" />
              )}
              Programar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

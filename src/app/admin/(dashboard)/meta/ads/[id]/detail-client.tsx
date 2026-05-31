"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Megaphone,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Film,
  Layers,
  Edit3,
  Save,
  XCircle,
  Bike,
  Play,
  Pause,
  Trophy,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/lib/admin-helpers"
import { OBJECTIVE_LABELS, CAMPAIGN_OBJECTIVES, CTAS } from "@/lib/meta/ads"
import { VideoUpload } from "@/components/admin/video-upload"

/**
 * Editor de detalle de una AdCampaign con su jerarquía AdSet → Ad.
 *
 * UI: accordion por AdSet, dentro cada Ad como card editable. Botones
 * para sumar AdSet a la campaña + sumar Ad a un AdSet.
 *
 * Edición:
 * - AdSet: nombre, presupuesto, fecha fin, audiencia (age min/max).
 * - Ad: nombre, caption, CTA, destinationUrl. (Cambiar media requiere
 *   recrear el creative — lo dejamos para iteración futura.)
 *
 * Comportamiento según status:
 * - DRAFT: cambios solo en DB, no llegan a Meta hasta "Publicar".
 * - IN_META_PAUSED / ACTIVE: algunos cambios suben a Meta directo,
 *   otros (cambio fuerte como objetivo) requieren republicar.
 */

type AdLite = {
  id: string
  name: string
  metaAdId: string | null
  status: string
  mediaType: string
  imageUrls: string[]
  videoUrls: string[]
  caption: string
  callToAction: string
  destinationUrl: string | null
  insightsCache: Record<string, unknown> | null
  errorMessage: string | null
}

type AdSetLite = {
  id: string
  name: string
  metaAdSetId: string | null
  status: string
  dailyBudgetCents: number | null
  startDate: string
  endDate: string
  audienceConfig: Record<string, unknown>
  insightsCache: Record<string, unknown> | null
  errorMessage: string | null
  ads: AdLite[]
}

type CampaignFull = {
  id: string
  name: string
  objective: string
  status: string
  dailyBudgetCents: number
  startDate: string
  endDate: string
  metaCampaignId: string | null
  errorMessage: string | null
  insightsCache: Record<string, unknown> | null
  moto: {
    id: string
    slug: string
    marca: string
    nombre: string
    fotoPrincipal: string | null
  }
  adSets: AdSetLite[]
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 dark:bg-neutral-800 text-gray-700",
  IN_META_PAUSED: "bg-blue-100 dark:bg-blue-900/40 text-blue-700",
  ACTIVE: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700",
  PAUSED_BY_USER: "bg-amber-100 dark:bg-amber-900/40 text-amber-700",
  PAUSED_BY_META: "bg-red-100 dark:bg-red-900/40 text-red-700",
  COMPLETED: "bg-purple-100 dark:bg-purple-900/40 text-purple-700",
  FAILED: "bg-red-100 dark:bg-red-900/40 text-red-700",
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  IN_META_PAUSED: "Lista (pausada)",
  ACTIVE: "Activa",
  PAUSED_BY_USER: "Pausada",
  PAUSED_BY_META: "Pausada (Meta)",
  COMPLETED: "Terminada",
  FAILED: "Error",
}

export function CampaignDetailClient({
  campaign,
  fotosMoto,
}: {
  campaign: CampaignFull
  fotosMoto: string[]
}) {
  const router = useRouter()
  const [showCreateAdSet, setShowCreateAdSet] = useState(false)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/meta/ads" />}
          className="-ml-2 mb-1"
        >
          <ArrowLeft className="size-4 mr-1" />
          Volver a campañas
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {campaign.moto.fotoPrincipal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.moto.fotoPrincipal}
                alt=""
                className="size-14 rounded-md object-cover bg-gray-100"
              />
            ) : (
              <div className="size-14 rounded-md bg-gray-100 flex items-center justify-center">
                <Bike className="size-6 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Megaphone className="size-6 text-[#6B4F7A]" />
                {campaign.moto.marca} {campaign.moto.nombre}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {campaign.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[campaign.status] || ""}`}
                >
                  {STATUS_LABEL[campaign.status] || campaign.status}
                </span>
                <span className="text-xs text-gray-500">
                  {OBJECTIVE_LABELS[campaign.objective as (typeof CAMPAIGN_OBJECTIVES)[number]] || campaign.objective}
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">
                  {campaign.adSets.length} conjunto(s) ·{" "}
                  {campaign.adSets.reduce((acc, s) => acc + s.ads.length, 0)} ad(s)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla comparativa de creativos (A/B testing) */}
      <CreativesComparison adSets={campaign.adSets} />

      {/* AdSets accordion */}
      <div className="space-y-3">
        {campaign.adSets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-gray-500">
              Esta campaña no tiene conjuntos todavía.
              <br />
              Tocá &quot;Sumar conjunto&quot; para empezar.
            </CardContent>
          </Card>
        ) : (
          campaign.adSets.map((adSet) => (
            <AdSetCard
              key={adSet.id}
              adSet={adSet}
              fotosMoto={fotosMoto}
              campaignDestUrl={`https://www.motosfernandez.com.ar/catalogo/${campaign.moto.slug}`}
            />
          ))
        )}

        {/* Botón sumar conjunto */}
        {showCreateAdSet ? (
          <NewAdSetForm
            campaignId={campaign.id}
            defaultBudget={campaign.dailyBudgetCents}
            defaultStart={campaign.startDate}
            defaultEnd={campaign.endDate}
            onCancel={() => setShowCreateAdSet(false)}
            onCreated={() => {
              setShowCreateAdSet(false)
              router.refresh()
            }}
          />
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowCreateAdSet(true)}
            className="w-full border-dashed border-[#6B4F7A]/40 text-[#6B4F7A] hover:bg-[#6B4F7A]/5"
          >
            <Plus className="size-4 mr-1.5" />
            Sumar conjunto (audiencia distinta)
          </Button>
        )}
      </div>
    </div>
  )
}

type AdInsights = {
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  spend?: number
  reach?: number
}

type CreativeRow = {
  id: string
  name: string
  adSetName: string
  mediaType: string
  thumb: string | null
  status: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
}

/**
 * Tabla comparativa de todos los ads de la campaña (across adsets).
 * Resalta el ganador por CTR (más alto = mejor) y por CPC (más bajo =
 * mejor, ignorando los que no tienen clicks). Solo se muestra si hay
 * ≥2 ads con datos de insights — sino no hay nada que comparar.
 */
function CreativesComparison({ adSets }: { adSets: AdSetLite[] }) {
  const rows: CreativeRow[] = []
  for (const s of adSets) {
    for (const ad of s.ads) {
      if (ad.status === "DELETED") continue
      const ins = (ad.insightsCache || {}) as AdInsights
      const impressions = ins.impressions || 0
      const clicks = ins.clicks || 0
      // CTR/CPC: usamos lo que vino de Meta; si falta, lo derivamos.
      const ctr = ins.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0)
      const cpc = ins.cpc ?? (clicks > 0 ? (ins.spend || 0) / clicks : 0)
      rows.push({
        id: ad.id,
        name: ad.name,
        adSetName: s.name,
        mediaType: ad.mediaType,
        thumb:
          ad.mediaType === "VIDEO" || ad.mediaType === "REEL"
            ? ad.videoUrls[0] || null
            : ad.imageUrls[0] || null,
        status: ad.status,
        impressions,
        clicks,
        ctr,
        cpc,
        spend: ins.spend || 0,
      })
    }
  }

  // Necesitamos al menos 2 ads y que alguno tenga impresiones para que
  // la comparación tenga sentido.
  const conDatos = rows.filter((r) => r.impressions > 0)
  if (rows.length < 2 || conDatos.length === 0) return null

  // Ganadores
  const bestCtr = conDatos.reduce((a, b) => (b.ctr > a.ctr ? b : a))
  const withClicks = conDatos.filter((r) => r.clicks > 0 && r.cpc > 0)
  const bestCpc = withClicks.length
    ? withClicks.reduce((a, b) => (b.cpc < a.cpc ? b : a))
    : null

  // Orden: mejor CTR primero
  const ordenadas = [...rows].sort((a, b) => b.ctr - a.ctr)

  const fmtCpc = (n: number) =>
    n > 0 ? `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : "—"

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-amber-500" />
          <h2 className="text-sm font-bold">Comparativa de creativos</h2>
          <span className="text-[11px] text-gray-400">
            cuál rinde mejor (CTR alto · CPC bajo)
          </span>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-neutral-800">
                <th className="py-1.5 px-1 font-medium">Creativo</th>
                <th className="py-1.5 px-1 font-medium text-right">Impr.</th>
                <th className="py-1.5 px-1 font-medium text-right">Clicks</th>
                <th className="py-1.5 px-1 font-medium text-right">CTR</th>
                <th className="py-1.5 px-1 font-medium text-right">CPC</th>
                <th className="py-1.5 px-1 font-medium text-right">Gasto</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((r) => {
                const isCtrWinner = r.id === bestCtr.id
                const isCpcWinner = bestCpc?.id === r.id
                return (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 dark:border-neutral-900 last:border-0"
                  >
                    <td className="py-1.5 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.thumb ? (
                          r.mediaType === "VIDEO" || r.mediaType === "REEL" ? (
                            <video src={r.thumb} muted className="size-8 rounded object-cover bg-black shrink-0" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.thumb} alt="" className="size-8 rounded object-cover bg-gray-100 shrink-0" />
                          )
                        ) : (
                          <div className="size-8 rounded bg-gray-200 shrink-0 flex items-center justify-center">
                            <ImageIcon className="size-3.5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[140px]">{r.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[140px]">
                            {r.adSetName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums">
                      {r.impressions.toLocaleString("es-AR")}
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums">
                      {r.clicks.toLocaleString("es-AR")}
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums">
                      <span
                        className={
                          isCtrWinner
                            ? "font-bold text-emerald-600 inline-flex items-center gap-0.5"
                            : ""
                        }
                      >
                        {isCtrWinner && <Trophy className="size-3" />}
                        {r.ctr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums">
                      <span
                        className={
                          isCpcWinner
                            ? "font-bold text-emerald-600 inline-flex items-center gap-0.5"
                            : ""
                        }
                      >
                        {isCpcWinner && <Trophy className="size-3" />}
                        {fmtCpc(r.cpc)}
                      </span>
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums text-gray-500">
                      {fmtCpc(r.spend)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 italic">
          Datos cacheados — se actualizan cada 6 h o al tocar
          &quot;Sincronizar&quot; en la lista de campañas. Pausá los que
          rinden peor y dejá corriendo el ganador.
        </p>
      </CardContent>
    </Card>
  )
}

function AdSetCard({
  adSet,
  fotosMoto,
  campaignDestUrl,
}: {
  adSet: AdSetLite
  fotosMoto: string[]
  campaignDestUrl: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [showCreateAd, setShowCreateAd] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const insights = adSet.insightsCache as { reach?: number; clicks?: number; spend?: number } | null

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar conjunto "${adSet.name}"? Se borran los ads dentro.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/meta/adsets/${adSet.id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  const isActive = adSet.status === "ACTIVE"
  const canToggle =
    !!adSet.metaAdSetId &&
    ["ACTIVE", "IN_META_PAUSED", "PAUSED_BY_USER"].includes(adSet.status)

  const handleToggle = async () => {
    setToggling(true)
    try {
      const res = await fetch(`/api/admin/meta/adsets/${adSet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isActive ? "PAUSED" : "ACTIVE" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        window.alert(d.error || `Error ${res.status}`)
        return
      }
      router.refresh()
    } finally {
      setToggling(false)
    }
  }

  const age = adSet.audienceConfig as { ageMin?: number; ageMax?: number }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-neutral-900/50"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Layers className="size-4 text-[#6B4F7A]" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{adSet.name}</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[adSet.status] || ""}`}
            >
              {STATUS_LABEL[adSet.status] || adSet.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {adSet.ads.length} ad(s) ·
            {adSet.dailyBudgetCents
              ? ` ${formatMoney(adSet.dailyBudgetCents / 100, "ARS")}/día ·`
              : " sin budget propio ·"}
            {" "}edad {age.ageMin ?? "?"}-{age.ageMax ?? "?"}
            {insights ? ` · ${insights.reach || 0} alcance` : ""}
          </p>
          {adSet.errorMessage && (
            <p className="text-[11px] text-red-600 truncate mt-0.5">
              ⚠ {adSet.errorMessage}
            </p>
          )}
        </div>
        {canToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleToggle()
            }}
            disabled={toggling}
            className={`p-1.5 rounded ${isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
            title={isActive ? "Pausar conjunto" : "Activar conjunto"}
          >
            {toggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isActive ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          disabled={deleting}
          className="p-1.5 rounded text-red-500 hover:bg-red-50"
          title="Eliminar conjunto"
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </button>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-neutral-800">
          {adSet.ads.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-3 text-center">
              Sin ads todavía. Sumá uno abajo.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {adSet.ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}

          {showCreateAd ? (
            <NewAdForm
              adSetId={adSet.id}
              fotosMoto={fotosMoto}
              defaultDest={campaignDestUrl}
              onCancel={() => setShowCreateAd(false)}
              onCreated={() => {
                setShowCreateAd(false)
                router.refresh()
              }}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateAd(true)}
              className="w-full border-dashed border-[#6B4F7A]/40 text-[#6B4F7A] hover:bg-[#6B4F7A]/5"
            >
              <Plus className="size-3.5 mr-1.5" />
              Sumar ad (creative distinto)
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function AdCard({ ad }: { ad: AdLite }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(ad.caption)
  const [cta, setCta] = useState(ad.callToAction)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const isActive = ad.status === "ACTIVE"
  const canToggle =
    !!ad.metaAdId &&
    ["ACTIVE", "IN_META_PAUSED", "PAUSED_BY_USER"].includes(ad.status)

  const handleToggle = async () => {
    setToggling(true)
    try {
      const res = await fetch(`/api/admin/meta/ads-items/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isActive ? "PAUSED" : "ACTIVE" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        window.alert(d.error || `Error ${res.status}`)
        return
      }
      router.refresh()
    } finally {
      setToggling(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/admin/meta/ads-items/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, callToAction: cta }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar ad "${ad.name}"?`)) return
    await fetch(`/api/admin/meta/ads-items/${ad.id}`, { method: "DELETE" })
    router.refresh()
  }

  const previewMedia =
    ad.mediaType === "VIDEO" || ad.mediaType === "REEL"
      ? ad.videoUrls[0]
      : ad.imageUrls[0]
  const insights = ad.insightsCache as { clicks?: number; impressions?: number; ctr?: number } | null

  return (
    <Card className="bg-gray-50 dark:bg-neutral-900/40 border-gray-200">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {previewMedia ? (
            ad.mediaType === "VIDEO" || ad.mediaType === "REEL" ? (
              <video
                src={previewMedia}
                className="size-16 rounded object-cover bg-black"
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewMedia} alt="" className="size-16 rounded object-cover bg-gray-100" />
            )
          ) : (
            <div className="size-16 rounded bg-gray-200 flex items-center justify-center">
              <ImageIcon className="size-5 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-semibold truncate">{ad.name}</p>
              <span className="text-[9px] uppercase font-bold text-[#6B4F7A] bg-[#6B4F7A]/10 px-1 rounded">
                {ad.mediaType.replace("_", " ")}
              </span>
            </div>
            <span
              className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_STYLES[ad.status] || ""}`}
            >
              {STATUS_LABEL[ad.status] || ad.status}
            </span>
            {insights && (
              <p className="text-[10px] text-gray-500 mt-1">
                {(insights.impressions || 0).toLocaleString("es-AR")} impr · CTR{" "}
                {(insights.ctr || 0).toFixed(2)}%
              </p>
            )}
          </div>
          <div className="flex flex-col gap-0.5 shrink-0">
            {canToggle && (
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                className={`p-1 rounded ${isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                title={isActive ? "Pausar ad" : "Activar ad"}
              >
                {toggling ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isActive ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="p-1 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-800"
              title="Editar"
            >
              <Edit3 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 rounded text-red-500 hover:bg-red-50"
              title="Eliminar"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <Textarea
              rows={4}
              value={caption}
              maxLength={2200}
              onChange={(e) => setCaption(e.target.value)}
              className="text-xs"
            />
            <select
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 dark:border-neutral-800"
            >
              {CTAS.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#6B4F7A]"
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <XCircle className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-line">
            {ad.caption}
          </p>
        )}

        {ad.errorMessage && (
          <p className="text-[10px] text-red-600 dark:text-red-400 truncate">
            ⚠ {ad.errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function NewAdSetForm({
  campaignId,
  defaultBudget,
  defaultStart,
  defaultEnd,
  onCancel,
  onCreated,
}: {
  campaignId: string
  defaultBudget: number
  defaultStart: string
  defaultEnd: string
  onCancel: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [budget, setBudget] = useState(String(defaultBudget / 100))
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(55)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/meta/campaigns/${campaignId}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          dailyBudgetCents: Number(budget) * 100,
          startDate: new Date(defaultStart).toISOString(),
          endDate: new Date(defaultEnd).toISOString(),
          audienceConfig: {
            ageMin,
            ageMax,
            genders: ["all"],
            locations: { countries: ["AR"], cities: [] },
            interests: [],
            languages: [],
          },
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
    <Card className="border-[#6B4F7A]/40 bg-[#6B4F7A]/5">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-bold text-[#6B4F7A] flex items-center gap-2">
            <Plus className="size-4" /> Nuevo conjunto
          </p>
          <div>
            <Label>Nombre del conjunto *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Audiencia 25-40 amantes motos"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Budget diario ARS *</Label>
              <Input type="number" min={1000} value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div>
              <Label>Edad mín.</Label>
              <Input type="number" min={18} max={65} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} />
            </div>
            <div>
              <Label>Edad máx.</Label>
              <Input type="number" min={18} max={65} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name} className="bg-[#6B4F7A]">
              {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Plus className="size-3.5 mr-1.5" />}
              Crear conjunto
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function NewAdForm({
  adSetId,
  fotosMoto,
  defaultDest,
  onCancel,
  onCreated,
}: {
  adSetId: string
  fotosMoto: string[]
  defaultDest: string
  onCancel: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [mediaType, setMediaType] = useState<"PHOTO" | "PHOTO_CAROUSEL" | "VIDEO" | "REEL">("PHOTO")
  // Para PHOTO/CAROUSEL: índices de fotosMoto seleccionados.
  const [fotosSel, setFotosSel] = useState<number[]>([0])
  const [videoUrl, setVideoUrl] = useState("")
  const [caption, setCaption] = useState("")
  const [cta, setCta] = useState<(typeof CTAS)[number]>("WHATSAPP_MESSAGE")
  const [dest, setDest] = useState(defaultDest)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const toggleFoto = (i: number) => {
    setFotosSel((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort()
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (mediaType === "PHOTO" && fotosSel.length !== 1)
      return setError("PHOTO: elegí exactamente 1 foto")
    if (mediaType === "PHOTO_CAROUSEL" && (fotosSel.length < 2 || fotosSel.length > 10))
      return setError("CAROUSEL: elegí entre 2 y 10 fotos")
    if ((mediaType === "VIDEO" || mediaType === "REEL") && !videoUrl)
      return setError("Subí un video")

    const imageUrls =
      mediaType === "PHOTO" || mediaType === "PHOTO_CAROUSEL"
        ? fotosSel.map((i) => fotosMoto[i]).filter(Boolean)
        : []
    const videoUrls =
      mediaType === "VIDEO" || mediaType === "REEL" ? [videoUrl] : []

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/meta/adsets/${adSetId}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mediaType,
          imageUrls,
          videoUrls,
          caption,
          callToAction: cta,
          destinationUrl: dest,
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
    <Card className="border-[#6B4F7A]/40 bg-[#6B4F7A]/5">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-bold text-[#6B4F7A] flex items-center gap-2">
            <Plus className="size-4" /> Nuevo ad (variación de creative)
          </p>
          <div>
            <Label>Nombre del ad *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carrusel 3 fotos vista lateral"
              required
            />
          </div>

          <div>
            <Label>Tipo de creative *</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {(["PHOTO", "PHOTO_CAROUSEL", "VIDEO", "REEL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMediaType(t)}
                  className={`rounded border-2 p-1.5 text-[10px] font-semibold transition-colors ${mediaType === t ? "border-[#6B4F7A] bg-[#6B4F7A]/10" : "border-gray-200"}`}
                >
                  {t === "PHOTO" && "📸 Foto"}
                  {t === "PHOTO_CAROUSEL" && "🖼 Carrusel"}
                  {t === "VIDEO" && "🎬 Video"}
                  {t === "REEL" && "⚡ Reel"}
                </button>
              ))}
            </div>
          </div>

          {(mediaType === "PHOTO" || mediaType === "PHOTO_CAROUSEL") && (
            <div>
              <Label>
                Fotos {mediaType === "PHOTO" ? "(1)" : "(2-10)"}
              </Label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {fotosMoto.slice(0, 10).map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleFoto(i)}
                    className={`relative aspect-square rounded overflow-hidden border-2 ${fotosSel.includes(i) ? "border-[#6B4F7A]" : "border-transparent opacity-60"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {fotosSel.includes(i) && (
                      <span className="absolute top-0.5 right-0.5 bg-[#6B4F7A] text-white text-[9px] rounded-full size-4 flex items-center justify-center font-bold">
                        {fotosSel.indexOf(i) + 1}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mediaType === "VIDEO" || mediaType === "REEL") && (
            <div>
              <Label>{mediaType === "REEL" ? "Reel" : "Video"}</Label>
              <VideoUpload value={videoUrl} onChange={setVideoUrl} folder="ads-videos" hint={mediaType === "REEL" ? "REEL" : "VIDEO"} />
            </div>
          )}

          <div>
            <Label>Copy del ad *</Label>
            <Textarea
              rows={3}
              maxLength={2200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>CTA</Label>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value as (typeof CTAS)[number])}
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-neutral-800"
              >
                {CTAS.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>URL destino</Label>
              <Input value={dest} onChange={(e) => setDest(e.target.value)} type="url" />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name || !caption} className="bg-[#6B4F7A]">
              {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Plus className="size-3.5 mr-1.5" />}
              Crear ad
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

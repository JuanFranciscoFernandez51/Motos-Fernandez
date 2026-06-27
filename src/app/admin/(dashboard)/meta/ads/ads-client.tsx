"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Megaphone,
  AlertTriangle,
  Loader2,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Rocket,
  Bike,
  TrendingUp,
  Sparkles,
  Eye,
  Info,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VideoUpload } from "@/components/admin/video-upload"
import { formatMoney } from "@/lib/admin-helpers"
import { OBJECTIVE_LABELS, CTAS, CAMPAIGN_OBJECTIVES } from "@/lib/meta/ads"

/**
 * UI base de Meta Ads. Iteración 1:
 * - Si no hay adAccountId configurado → wizard de elegir ad account.
 * - Si hay → lista de campañas + botón "Nueva campaña" → modal con form
 *   lineal (no wizard fancy aún).
 *
 * Wizard multi-step queda para iteración 2 cuando Francisco use esto
 * unos días y veamos qué le simplifica el flujo.
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
  fotos: string[]
}

type CampaignLite = {
  id: string
  name: string
  objective: string
  status: string
  dailyBudgetCents: number
  startDate: string
  endDate: string
  insightsCache: Record<string, unknown> | null
  errorMessage: string | null
  metaCampaignId: string | null
  moto: {
    id: string
    slug: string
    marca: string
    nombre: string
    fotoPrincipal: string | null
  }
}

const STATUS_STYLES: Record<string, { label: string; bg: string }> = {
  DRAFT: {
    label: "Borrador",
    bg: "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300",
  },
  IN_META_PAUSED: {
    label: "Lista para activar",
    bg: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  },
  ACTIVE: {
    label: "Activa",
    bg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  },
  PAUSED_BY_USER: {
    label: "Pausada",
    bg: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  },
  PAUSED_BY_META: {
    label: "Pausada (Meta)",
    bg: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  },
  COMPLETED: {
    label: "Terminada",
    bg: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  },
  FAILED: {
    label: "Error",
    bg: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  },
}

export function AdsClient({
  featureEnabled,
  adAccountId,
  minBudget,
  motos,
  campaigns,
}: {
  featureEnabled: boolean
  adAccountId: string | null
  minBudget: number
  motos: MotoLite[]
  campaigns: CampaignLite[]
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  if (!adAccountId) {
    return <AdAccountSetup featureEnabled={featureEnabled} />
  }

  return (
    <div className="space-y-5">
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
            <Megaphone className="size-6 text-[#7C3AED]" />
            Meta Ads
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Campañas pagas en Facebook + Instagram. Ad account: {" "}
            <code className="text-xs bg-gray-100 dark:bg-neutral-800 px-1 rounded">
              {adAccountId}
            </code>
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
          disabled={!featureEnabled || motos.length === 0}
          title={
            !featureEnabled
              ? "FEATURE_META_ADS_ENABLED no está en true"
              : motos.length === 0
                ? "No hay motos activas con fotos"
                : ""
          }
        >
          <Plus className="size-4 mr-1.5" />
          Nueva campaña
        </Button>
      </div>

      {!featureEnabled && <FeatureFlagWarning />}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500 dark:text-gray-400">
            <Megaphone className="size-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">
              Todavía no hay campañas. Tocá &quot;Nueva campaña&quot; para crear
              la primera (arranca en borrador, no se publica hasta que la
              activés explícitamente).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCampaignModal
          motos={motos}
          minBudget={minBudget}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}

function FeatureFlagWarning() {
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            Feature flag apagado
          </p>
          <p className="text-amber-800 dark:text-amber-300 mt-1">
            Seteá{" "}
            <code className="bg-amber-200/50 dark:bg-amber-900/40 px-1 rounded">
              FEATURE_META_ADS_ENABLED=true
            </code>{" "}
            en Vercel y redeploy para habilitar crear campañas + el cron
            de sync de insights cada 6h.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function CampaignRow({ campaign }: { campaign: CampaignLite }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const s = STATUS_STYLES[campaign.status] || STATUS_STYLES.DRAFT
  const insights = campaign.insightsCache as
    | {
        reach?: number
        impressions?: number
        clicks?: number
        spend?: number
      }
    | null

  const callApi = async (action: string, body?: unknown) => {
    setLoading(action)
    try {
      const res = await fetch(
        `/api/admin/meta/campaigns/${campaign.id}${action === "delete" ? "" : "/" + action}`,
        {
          method: action === "delete" ? "DELETE" : "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || `Error ${res.status}`)
      }
      startTransition(() => router.refresh())
    } finally {
      setLoading(null)
    }
  }

  const handlePublish = () => callApi("publish")
  const handleActivate = () => {
    if (
      !window.confirm(
        `¿Activar campaña "${campaign.name}"?\n\nA partir de ahora va a empezar a consumir presupuesto en Meta (${formatMoney(campaign.dailyBudgetCents / 100, "ARS")}/día).`
      )
    )
      return
    callApi("activate", { confirm: true })
  }
  const handlePause = () => callApi("pause")
  const handleSync = () => callApi("sync")
  const handleDelete = () => {
    if (!window.confirm("¿Eliminar esta campaña? (pausa en Meta + soft delete)")) return
    callApi("delete")
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3 flex-wrap">
        {campaign.moto.fotoPrincipal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.moto.fotoPrincipal}
            alt=""
            className="size-14 rounded-md object-cover bg-gray-100 dark:bg-neutral-800 shrink-0"
          />
        ) : (
          <div className="size-14 rounded-md bg-gray-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Bike className="size-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {campaign.moto.marca} {campaign.moto.nombre}
            </p>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg}`}>
              {s.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {OBJECTIVE_LABELS[campaign.objective as (typeof CAMPAIGN_OBJECTIVES)[number]] || campaign.objective}
            {" · "}
            {formatMoney(campaign.dailyBudgetCents / 100, "ARS")}/día
            {" · "}
            {new Date(campaign.startDate).toLocaleDateString("es-AR")} →{" "}
            {new Date(campaign.endDate).toLocaleDateString("es-AR")}
          </p>
          {insights && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300 flex-wrap">
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3" /> Alcance:{" "}
                {(insights.reach || 0).toLocaleString("es-AR")}
              </span>
              <span>Clicks: {(insights.clicks || 0).toLocaleString("es-AR")}</span>
              <span>
                Gasto: {formatMoney(Number(insights.spend || 0), "ARS")}
              </span>
            </div>
          )}
          {campaign.errorMessage && (
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 truncate">
              ⚠ {campaign.errorMessage}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {(campaign.status === "DRAFT" || campaign.status === "FAILED") && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={loading !== null}
              className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
            >
              {loading === "publish" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Rocket className="size-3.5 mr-1" />
              )}
              {campaign.status === "FAILED" ? "Reintentar publicación" : "Publicar a Meta"}
            </Button>
          )}
          {(campaign.status === "IN_META_PAUSED" || campaign.status === "PAUSED_BY_USER") && (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={loading !== null}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading === "activate" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 mr-1" />
              )}
              Activar
            </Button>
          )}
          {campaign.status === "ACTIVE" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={loading !== null}
            >
              {loading === "pause" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Pause className="size-3.5 mr-1" />
              )}
              Pausar
            </Button>
          )}
          {/* Sync solo si ya está en Meta (tiene metaCampaignId). Las DRAFT
              y FAILED-sin-publicar no tienen métricas que sincronizar. */}
          {campaign.metaCampaignId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={loading !== null}
              title="Refrescar métricas desde Meta"
            >
              {loading === "sync" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/admin/meta/ads/${campaign.id}`} />}
            className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10"
            title="Ver conjuntos y ads · A/B testing"
          >
            <Eye className="size-3.5 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={loading !== null}
            className="text-red-600 hover:bg-red-50"
          >
            {loading === "delete" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Setup wizard del ad account (cuando todavía no se eligió uno).
 *
 * /me/adaccounts no funciona con el Page Access Token que tenemos
 * guardado (es endpoint de User Token). Si no podemos listar, mostramos
 * solo el input manual. Si podemos, mostramos lista + input manual.
 */
function AdAccountSetup({ featureEnabled }: { featureEnabled: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<
    Array<{
      id: string
      name: string
      currency: string
      account_status: number
      business?: { name: string }
    }>
  >([])
  const [listWarning, setListWarning] = useState("")
  const [error, setError] = useState("")
  const [selected, setSelected] = useState("")
  const [manualId, setManualId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/meta/ad-account")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setAccounts(data.availableAccounts || [])
          if (data.listError) setListWarning(data.listError)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const guardar = async (adAccountId: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/meta/ad-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || `Error ${res.status}`)
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLista = () => selected && guardar(selected)
  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualId.trim()
    if (!/^act_\d+$/.test(trimmed)) {
      alert("Formato esperado: act_XXXXXXXXX (empieza con act_ y números)")
      return
    }
    guardar(trimmed)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/meta" />}
          className="-ml-2"
        >
          <ArrowLeft className="size-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mt-2">
          <Megaphone className="size-6 text-[#7C3AED]" />
          Meta Ads — setup inicial
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Elegí qué ad account usar para crear campañas. Tiene que ser una
          ad account de Meta Business Manager con saldo configurado.
        </p>
      </div>

      {!featureEnabled && <FeatureFlagWarning />}

      {loading ? (
        <Card>
          <CardContent className="p-5 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="size-4 animate-spin" />
            Cargando ad accounts disponibles…
          </CardContent>
        </Card>
      ) : (
        <>
          {error && (
            <Card className="border-red-200">
              <CardContent className="p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </CardContent>
            </Card>
          )}

          {/* Lista descubierta (solo si pudimos listar) */}
          {accounts.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Detectamos {accounts.length} ad account{accounts.length > 1 ? "s" : ""}:
                </p>
                <div className="space-y-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected(a.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selected === a.id ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 dark:border-neutral-800 hover:border-[#7C3AED]/50"}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {a.name}
                        </p>
                        <code className="text-[10px] bg-gray-100 dark:bg-neutral-800 px-1 rounded">
                          {a.id}
                        </code>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.account_status === 1 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                        >
                          {a.account_status === 1 ? "Activa" : `Estado ${a.account_status}`}
                        </span>
                        {selected === a.id && (
                          <CheckCircle2 className="size-4 text-[#7C3AED] ml-auto" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Moneda: {a.currency}
                        {a.business?.name ? ` · Business: ${a.business.name}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleSaveLista}
                  disabled={!selected || saving}
                  className="bg-[#7C3AED] hover:bg-[#9D5CF0] w-full"
                >
                  {saving ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4 mr-2" />
                  )}
                  Usar este ad account
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Input manual — siempre disponible. Si /me/adaccounts falló
              (page token no soporta el endpoint), esta es la única forma. */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {accounts.length > 0
                    ? "¿No aparece la cuenta que querés?"
                    : "Pegá el ID de tu ad account"}
                </p>
                {listWarning && accounts.length === 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 italic">
                    No pude listar automáticamente (el page token no soporta
                    el endpoint /me/adaccounts). Pegalo a mano abajo.
                  </p>
                )}
              </div>
              <form onSubmit={handleSaveManual} className="space-y-2">
                <Label htmlFor="manual">ID del ad account (formato act_XXXX)</Label>
                <Input
                  id="manual"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="act_123456789"
                  className="font-mono"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Lo encontrás en{" "}
                  <a
                    href="https://business.facebook.com/settings/ad-accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[#7C3AED]"
                  >
                    Business Manager → Cuentas publicitarias
                  </a>{" "}
                  (en el header del ad account dice el ID con prefijo
                  &quot;act_&quot;).
                </p>
                <Button
                  type="submit"
                  disabled={saving || !manualId.trim()}
                  className="bg-[#7C3AED] hover:bg-[#9D5CF0]"
                >
                  {saving ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/**
 * Texto explicativo de cada objetivo + presupuesto recomendado.
 * Sirve como guía in-context para que el admin entienda qué elegir.
 */
const OBJECTIVE_HELP: Record<
  (typeof CAMPAIGN_OBJECTIVES)[number],
  { desc: string; recommendedBudgetARS: number; useCase: string }
> = {
  OUTCOME_TRAFFIC: {
    desc: "Lleva gente a la ficha de la moto en la web. Mide clicks al link.",
    recommendedBudgetARS: 2000,
    useCase: "Ideal para motos con stock disponible y ficha completa.",
  },
  OUTCOME_ENGAGEMENT: {
    desc: "Likes, comentarios y shares en la publicación. Buena para crecer cuenta IG/FB.",
    recommendedBudgetARS: 1500,
    useCase: "Cuando querés brand awareness o crecer seguidores.",
  },
  OUTCOME_LEADS: {
    desc: "Genera conversaciones por WhatsApp o leads de formulario. Mide consultas reales.",
    recommendedBudgetARS: 3000,
    useCase: "El más directo para vender: pagás por consultas, no por clicks.",
  },
  OUTCOME_AWARENESS: {
    desc: "Maximiza alcance e impresiones. Que vea la moto la mayor cantidad de gente.",
    recommendedBudgetARS: 1500,
    useCase: "Útil para lanzamientos o motos premium poco conocidas.",
  },
}

/**
 * Modal de creación de campaña. Iteración 2 con:
 * - Selector visual de objetivo con descripción y presupuesto sugerido.
 * - Generador de caption con IA (Claude) según moto + objetivo.
 * - Preview en tiempo real de cómo se va a ver el anuncio.
 * - Validaciones espejo del backend.
 */
function CreateCampaignModal({
  motos,
  minBudget,
  onClose,
}: {
  motos: MotoLite[]
  minBudget: number
  onClose: () => void
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [error, setError] = useState("")
  const [motoId, setMotoId] = useState("")
  const [searchMoto, setSearchMoto] = useState("")
  const [objective, setObjective] = useState<(typeof CAMPAIGN_OBJECTIVES)[number]>(
    "OUTCOME_LEADS"
  )
  const [dailyBudget, setDailyBudget] = useState<string>(
    String(OBJECTIVE_HELP.OUTCOME_LEADS.recommendedBudgetARS)
  )
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  )
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  )
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(55)
  const [creativeCaption, setCreativeCaption] = useState("")
  const [cta, setCta] = useState<(typeof CTAS)[number]>("WHATSAPP_MESSAGE")
  const [destinationUrl, setDestinationUrl] = useState("")
  const [mediaType, setMediaType] = useState<"PHOTO" | "VIDEO" | "REEL">("PHOTO")
  const [videoUrl, setVideoUrl] = useState("")

  // Cuando cambia el objetivo: sugerir el CTA + presupuesto recomendado
  // automáticamente (a menos que el admin ya haya tocado el budget).
  const [budgetTocado, setBudgetTocado] = useState(false)
  useEffect(() => {
    if (!budgetTocado) {
      setDailyBudget(String(OBJECTIVE_HELP[objective].recommendedBudgetARS))
    }
    // CTA por defecto según objetivo
    setCta(
      objective === "OUTCOME_LEADS"
        ? "WHATSAPP_MESSAGE"
        : objective === "OUTCOME_TRAFFIC"
          ? "LEARN_MORE"
          : objective === "OUTCOME_ENGAGEMENT"
            ? "LEARN_MORE"
            : "LEARN_MORE"
    )
  }, [objective, budgetTocado])

  const motosFiltradas = useMemo(() => {
    const q = searchMoto.trim().toLowerCase()
    if (!q) return motos.slice(0, 30)
    return motos
      .filter((m) =>
        `${m.marca} ${m.nombre} ${m.slug}`.toLowerCase().includes(q)
      )
      .slice(0, 30)
  }, [searchMoto, motos])
  const motoSel = motos.find((m) => m.id === motoId)

  // Pre-popular destinationUrl con la ficha de la moto
  useEffect(() => {
    if (motoSel && !destinationUrl) {
      setDestinationUrl(`https://www.motosfernandez.com.ar/catalogo/${motoSel.slug}`)
    }
  }, [motoSel, destinationUrl])

  const handleGenerarCaption = async () => {
    if (!motoSel) {
      setError("Elegí una moto antes de generar el copy con IA")
      return
    }
    setGeneratingCaption(true)
    setError("")
    try {
      const res = await fetch("/api/admin/meta/ads/suggest-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motoId, objective }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      setCreativeCaption(data.caption || "")
    } finally {
      setGeneratingCaption(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!motoSel) return setError("Elegí una moto")
    if (Number(dailyBudget) < minBudget) {
      return setError(`Presupuesto diario mínimo: ${minBudget}`)
    }
    if ((mediaType === "VIDEO" || mediaType === "REEL") && !videoUrl) {
      return setError("Subí un video o cambiá el formato a Foto")
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/meta/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motoId,
          objective,
          dailyBudgetCents: Number(dailyBudget) * 100,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          audienceConfig: {
            ageMin,
            ageMax,
            genders: ["all"],
            locations: { countries: ["AR"], cities: [] },
            interests: [],
            languages: [],
          },
          creativeImageUrl: motoSel.fotos[0],
          creativeMediaType: mediaType,
          creativeVideoUrl:
            mediaType === "VIDEO" || mediaType === "REEL" ? videoUrl : null,
          creativeCaption: creativeCaption || `${motoSel.marca} ${motoSel.nombre} — ¡consultá ya!`,
          creativeCallToAction: cta,
          destinationUrl: destinationUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      onClose()
      router.refresh()
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
              Nueva campaña — arranca en BORRADOR
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="size-5" />
            </button>
          </div>

          <div>
            <Label>Moto *</Label>
            <Input
              value={searchMoto}
              onChange={(e) => setSearchMoto(e.target.value)}
              placeholder="Buscar…"
              className="mb-2"
            />
            <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-neutral-800">
              {motosFiltradas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotoId(m.id)}
                  className={`w-full text-left p-2 flex items-center gap-2 border-b last:border-b-0 border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 ${motoId === m.id ? "bg-[#7C3AED]/10" : ""}`}
                >
                  {m.fotoPrincipal && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.fotoPrincipal}
                      alt=""
                      className="size-8 rounded object-cover bg-gray-100 dark:bg-neutral-800 shrink-0"
                    />
                  )}
                  <span className="text-sm">{m.marca} {m.nombre}</span>
                  {motoId === m.id && <CheckCircle2 className="size-4 text-[#7C3AED] ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Objetivo de la campaña *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {CAMPAIGN_OBJECTIVES.map((obj) => {
                const info = OBJECTIVE_HELP[obj]
                return (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => setObjective(obj)}
                    className={`text-left rounded-lg border-2 p-3 transition-colors ${objective === obj ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 dark:border-neutral-800 hover:border-[#7C3AED]/50"}`}
                  >
                    <p className={`text-xs ${objective === obj ? "font-bold" : "font-semibold"} text-gray-900 dark:text-gray-100`}>
                      {OBJECTIVE_LABELS[obj]}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                      {info.desc}
                    </p>
                    <p className="text-[10px] text-[#7C3AED] mt-1.5 font-medium">
                      Recomendado: ${info.recommendedBudgetARS.toLocaleString("es-AR")}/día
                    </p>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              <span>{OBJECTIVE_HELP[objective].useCase}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="budget">Presupuesto diario (ARS) *</Label>
              <Input
                id="budget"
                type="number"
                min={minBudget}
                value={dailyBudget}
                onChange={(e) => {
                  setBudgetTocado(true)
                  setDailyBudget(e.target.value)
                }}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Mín: ${minBudget.toLocaleString("es-AR")} · Sugerido para este
                objetivo: ${OBJECTIVE_HELP[objective].recommendedBudgetARS.toLocaleString("es-AR")}
              </p>
            </div>
            <div>
              <Label>CTA del botón</Label>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value as (typeof CTAS)[number])}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              >
                {CTAS.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start">Inicio *</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end">Fin *</Label>
              <Input
                id="end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ageMin">Edad mín.</Label>
              <Input
                id="ageMin"
                type="number"
                min={18}
                max={65}
                value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="ageMax">Edad máx.</Label>
              <Input
                id="ageMax"
                type="number"
                min={18}
                max={65}
                value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>Formato del creativo *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["PHOTO", "VIDEO", "REEL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMediaType(t)}
                  className={`rounded-lg border-2 p-2 text-center transition-colors ${mediaType === t ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 dark:border-neutral-800 hover:border-[#7C3AED]/50"}`}
                >
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {t === "PHOTO" ? "Foto" : t === "VIDEO" ? "Video" : "Reel"}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {t === "PHOTO"
                      ? "Foto de la moto"
                      : t === "VIDEO"
                        ? "Feed horizontal"
                        : "Vertical 9:16"}
                  </p>
                </button>
              ))}
            </div>
            {(mediaType === "VIDEO" || mediaType === "REEL") && (
              <div className="mt-3">
                <Label className="flex items-center gap-1.5">
                  <Play className="size-3.5" /> Video del aviso *
                </Label>
                <VideoUpload
                  value={videoUrl}
                  onChange={setVideoUrl}
                  hint={mediaType === "REEL" ? "REEL" : "VIDEO"}
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  La foto de portada (primera foto de la moto) se usa como
                  miniatura mientras carga el video.
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="caption">Texto del aviso *</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerarCaption}
                disabled={generatingCaption || !motoSel}
                className="text-xs border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10"
                title="Genera un copy profesional con IA según la moto y el objetivo"
              >
                {generatingCaption ? (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="size-3 mr-1.5" />
                )}
                {generatingCaption ? "Generando…" : "Generar con IA"}
              </Button>
            </div>
            <Textarea
              id="caption"
              rows={5}
              maxLength={2200}
              value={creativeCaption}
              onChange={(e) => setCreativeCaption(e.target.value)}
              placeholder="Escribilo a mano o tocá 'Generar con IA' para que Claude lo arme según la moto + objetivo. Lo podés editar después."
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">
              {creativeCaption.length} / 2200 chars
            </p>
          </div>

          {/* Preview del anuncio: mock simple de cómo se vería en IG/FB */}
          {motoSel && (creativeCaption || motoSel.fotoPrincipal) && (
            <div>
              <Label className="flex items-center gap-1.5">
                <Eye className="size-3.5" /> Preview del anuncio
              </Label>
              <div className="mt-1 max-w-sm mx-auto rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                {/* Header tipo IG */}
                <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-neutral-800">
                  <div className="size-7 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">motos.fernandez</p>
                    <p className="text-[10px] text-gray-400">Publicidad · Bahía Blanca</p>
                  </div>
                </div>
                {/* Media: video si hay, sino imagen */}
                {(mediaType === "VIDEO" || mediaType === "REEL") && videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className={`w-full bg-black object-cover ${mediaType === "REEL" ? "aspect-[9/16]" : "aspect-video"}`}
                  />
                ) : (
                  motoSel.fotoPrincipal && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={motoSel.fotoPrincipal}
                      alt=""
                      className="w-full aspect-square object-cover bg-gray-100"
                    />
                  )
                )}
                {/* CTA bar */}
                <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-950 border-y border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    motosfernandez.com.ar
                  </p>
                  <span className="text-[11px] font-semibold text-[#7C3AED]">
                    {cta.replace(/_/g, " ")}
                  </span>
                </div>
                {/* Caption */}
                {creativeCaption && (
                  <div className="p-3 text-xs whitespace-pre-line line-clamp-6 text-gray-700 dark:text-gray-300">
                    {creativeCaption}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-center italic">
                Vista aproximada — el render real en Meta puede variar
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="dest">URL destino</Label>
            <Input
              id="dest"
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://www.motosfernandez.com.ar/catalogo/..."
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Se autocompleta con la ficha de la moto. Cambialo solo si querés
              que el click vaya a otra página.
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
                <Plus className="size-4 mr-2" />
              )}
              Crear en borrador
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

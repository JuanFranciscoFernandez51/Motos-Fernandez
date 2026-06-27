"use client"

import { useEffect, useState } from "react"
import { Save, Loader2, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * Modo Mundial 🇦🇷 — configuración (sección Marketing).
 *
 * Carga la SiteConfig completa y la vuelve a guardar entera (igual que la
 * página de Configuración) para no pisar otros campos. Sólo edita los campos
 * mundialActivo / mundialDesde / mundialHasta.
 */

type Config = Record<string, unknown> & {
  mundialActivo?: boolean
  mundialDesde?: string | null
  mundialHasta?: string | null
}

export default function ModoMundialPage() {
  const [config, setConfig] = useState<Config>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          ...data,
          mundialActivo: Boolean(data.mundialActivo),
          mundialDesde: data.mundialDesde ? String(data.mundialDesde).slice(0, 10) : "",
          mundialHasta: data.mundialHasta ? String(data.mundialHasta).slice(0, 10) : "",
          mundialBarraEstilo: data.mundialBarraEstilo === "marquee" ? "marquee" : "bandera",
          mundialConfetti: data.mundialConfetti !== false,
          mundialConfettiNivel: data.mundialConfettiNivel || "sutil",
          promoEnvioActiva: Boolean(data.promoEnvioActiva),
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const set = (key: keyof Config, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const activo = Boolean(config.mundialActivo)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span aria-hidden>🇦🇷</span> Modo Mundial
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Prende animaciones festivas en la web pública: banner arriba con las
          3 estrellas, confeti al entrar y al scrollear, decoraciones flotando y
          las cards de motos en celeste-blanco con el precio en amarillo al pasar
          el mouse.
        </p>
      </div>

      {/* Estado */}
      <div
        className={`rounded-xl border p-4 text-sm font-medium flex items-center gap-2 ${
          activo
            ? "bg-[#75AADB]/10 border-[#75AADB]/40 text-[#0B2A4A] dark:text-[#9FD0F0]"
            : "bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-500"
        }`}
      >
        <span aria-hidden>{activo ? "🎉" : "💤"}</span>
        {activo
          ? "Modo Mundial PRENDIDO (sujeto a las fechas de abajo si están cargadas)."
          : "Modo Mundial apagado."}
      </div>

      {/* Switch + fechas */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border p-6 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => set("mundialActivo", e.target.checked)}
            className="w-5 h-5 rounded accent-[#75AADB]"
          />
          <div>
            <p className="text-sm font-medium">Activar Modo Mundial</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Switch maestro. Si lo apagás, no se muestra nada en la web.
            </p>
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100 dark:border-neutral-800">
          <div className="pt-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Desde (opcional)
            </label>
            <Input
              type="date"
              value={(config.mundialDesde as string) || ""}
              onChange={(e) => set("mundialDesde", e.target.value)}
            />
          </div>
          <div className="pt-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Hasta (opcional)
            </label>
            <Input
              type="date"
              value={(config.mundialHasta as string) || ""}
              onChange={(e) => set("mundialHasta", e.target.value)}
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          Sin fechas: queda activo mientras el switch esté prendido. Con fechas:
          se muestra sólo dentro de ese rango y se apaga solo al terminar.
        </p>
      </div>

      {/* Estilo de barra */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border p-6 space-y-3">
        <p className="text-sm font-medium">Estilo de la barra de arriba</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              v: "bandera",
              titulo: "Bandera",
              desc: "Franja celeste/blanca con Sol de Mayo y brillo. Clásica y festiva.",
            },
            {
              v: "marquee",
              titulo: "Marquee oscuro",
              desc: "Cinta negra con frases desplazándose. Fiel a tu estilo actual.",
            },
          ].map((op) => {
            const sel = (config.mundialBarraEstilo as string) === op.v
            return (
              <button
                key={op.v}
                type="button"
                onClick={() => set("mundialBarraEstilo", op.v)}
                className={`text-left rounded-lg border p-3 transition ${
                  sel
                    ? "border-[#75AADB] ring-2 ring-[#75AADB]/40 bg-[#75AADB]/5"
                    : "border-gray-200 dark:border-neutral-800 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold">{op.titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{op.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Confetti */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border p-6 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.mundialConfetti !== false}
            onChange={(e) => set("mundialConfetti", e.target.checked)}
            className="w-5 h-5 rounded accent-[#75AADB]"
          />
          <div>
            <p className="text-sm font-medium">Confeti celeste y blanco</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cae confeti suave por toda la web mientras el Modo Mundial está prendido.
            </p>
          </div>
        </label>

        {config.mundialConfetti !== false && (
          <div className="pt-1 border-t border-gray-100 dark:border-neutral-800">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-3">
              Cantidad
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "sutil", t: "Sutil" },
                { v: "medio", t: "Medio" },
                { v: "trapo", t: "A todo trapo" },
              ].map((op) => {
                const sel = ((config.mundialConfettiNivel as string) || "sutil") === op.v
                return (
                  <button
                    key={op.v}
                    type="button"
                    onClick={() => set("mundialConfettiNivel", op.v)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      sel
                        ? "border-[#75AADB] ring-2 ring-[#75AADB]/40 bg-[#75AADB]/5 text-[#0B2A4A] dark:text-[#9FD0F0]"
                        : "border-gray-200 dark:border-neutral-800 hover:border-gray-300 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {op.t}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Promo Envío gratis al Sur */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border p-6 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(config.promoEnvioActiva)}
            onChange={(e) => set("promoEnvioActiva", e.target.checked)}
            className="w-5 h-5 rounded accent-[#75AADB]"
          />
          <div>
            <p className="text-sm font-medium">📦 Promo &quot;Envío gratis a todo el Sur&quot;</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Prende la franja celeste arriba, el sello giratorio &quot;GRATIS AL SUR&quot; en el
              hero y sobre las usadas que aplican, y el bloque de envío en la home.
            </p>
          </div>
        </label>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300">
          ⚠️ El sello solo aparece sobre <strong>motos usadas de hasta 650cc</strong> (se toma de
          la cilindrada cargada). El límite de cilindrada no se muestra como texto en la web — va
          solo en la letra chica / Términos. Usa la misma ventana de fechas de arriba.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-[#7C3AED] hover:bg-[#9D5CF0]">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-300">
            <CheckCircle className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </div>
  )
}

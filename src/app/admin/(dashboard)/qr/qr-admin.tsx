"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  QrCode,
  Download,
  Copy,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  Check,
  Lock,
  Unlock,
} from "lucide-react"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/admin-helpers"

type Shortlink = {
  id: string
  codigo: string
  modeloId: string | null
  modeloNombre: string | null
  modeloMarca: string | null
  modeloSlug: string | null
  urlCustom: string | null
  descripcion: string | null
  activo: boolean
  protegido: boolean
  scans: number
  ultimoScan: Date | null
}

type Modelo = {
  id: string
  nombre: string
  slug: string
  marca: string
  esUsado: boolean
}

export function QrAdmin({
  initial,
  modelos,
  baseUrl,
}: {
  initial: Shortlink[]
  modelos: Modelo[]
  baseUrl: string
}) {
  const [shortlinks, setShortlinks] = useState<Shortlink[]>(initial)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Shortlink | null>(null)
  const [form, setForm] = useState({
    codigo: "",
    modeloId: "",
    urlCustom: "",
    descripcion: "",
    activo: true,
    protegido: false,
  })
  const [copied, setCopied] = useState<string | null>(null)

  function startCreate() {
    setEditing(null)
    setForm({ codigo: "", modeloId: "", urlCustom: "", descripcion: "", activo: true, protegido: false })
    setShowForm(true)
  }

  function startEdit(s: Shortlink) {
    setEditing(s)
    setForm({
      codigo: s.codigo,
      modeloId: s.modeloId || "",
      urlCustom: s.urlCustom || "",
      descripcion: s.descripcion || "",
      activo: s.activo,
      protegido: s.protegido,
    })
    setShowForm(true)
  }

  // Candado rápido desde la card (sin abrir el form)
  async function toggleProtegido(s: Shortlink) {
    if (s.protegido) {
      if (
        !confirm(
          `Vas a DESBLOQUEAR el QR "${s.codigo}". Mientras esté desbloqueado se puede borrar, desactivar o cambiarle el código (y eso rompe el QR impreso). ¿Seguro?`
        )
      )
        return
    }
    const res = await fetch(`/api/admin/qr/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protegido: !s.protegido }),
    })
    if (!res.ok) {
      toast.error("No se pudo cambiar el candado")
      return
    }
    setShortlinks((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, protegido: !s.protegido } : x))
    )
    toast.success(s.protegido ? "QR desbloqueado" : "QR protegido 🔒")
  }

  async function save() {
    if (!form.codigo.trim()) {
      toast.error("Falta el código corto")
      return
    }
    if (!form.modeloId && !form.urlCustom) {
      toast.error("Tenés que elegir un modelo o ingresar una URL custom")
      return
    }
    const url = editing ? `/api/admin/qr/${editing.id}` : "/api/admin/qr"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Error al guardar")
      return
    }
    const link = await res.json()
    if (editing) {
      setShortlinks((prev) =>
        prev.map((s) =>
          s.id === editing.id
            ? {
                ...s,
                ...link,
                modeloNombre:
                  modelos.find((m) => m.id === link.modeloId)?.nombre || null,
                modeloSlug:
                  modelos.find((m) => m.id === link.modeloId)?.slug || null,
                modeloMarca:
                  modelos.find((m) => m.id === link.modeloId)?.marca || null,
              }
            : s
        )
      )
    } else {
      setShortlinks((prev) => [
        {
          ...link,
          modeloNombre: modelos.find((m) => m.id === link.modeloId)?.nombre || null,
          modeloSlug: modelos.find((m) => m.id === link.modeloId)?.slug || null,
          modeloMarca: modelos.find((m) => m.id === link.modeloId)?.marca || null,
        },
        ...prev,
      ])
    }
    setShowForm(false)
    toast.success("Guardado")
    startTransition(() => router.refresh())
  }

  async function eliminar(s: Shortlink) {
    if (s.protegido) {
      toast.error("QR protegido 🔒 — desbloquealo con el candado antes de borrarlo.")
      return
    }
    if (s.scans > 0) {
      if (
        !confirm(
          `Este QR ya tiene ${s.scans} escaneos. Si lo borrás, los acrílicos impresos quedan rotos. ¿Estás seguro?`
        )
      )
        return
    } else if (!confirm(`¿Eliminar el shortlink "${s.codigo}"?`)) {
      return
    }
    const res = await fetch(`/api/admin/qr/${s.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Error al eliminar")
      return
    }
    setShortlinks((prev) => prev.filter((x) => x.id !== s.id))
    toast.success("Eliminado")
  }

  function copiar(s: Shortlink) {
    const url = `${baseUrl}/m/${s.codigo}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(s.id)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header con botón nuevo */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {shortlinks.length} shortlinks · {shortlinks.reduce((s, x) => s + x.scans, 0)} escaneos totales
        </p>
        <Button onClick={startCreate} className="bg-[#7ECAD6] hover:bg-[#5BB5C2]">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo QR
        </Button>
      </div>

      {/* Form modal-like */}
      {showForm && (
        <Card className="border-2 border-[#7ECAD6]/40 bg-[#7ECAD6]/5">
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? `Editar shortlink "${editing.codigo}"` : "Nuevo shortlink"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing && editing.scans > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                ⚠️ Este shortlink ya tiene {editing.scans} escaneos. Cambiar el{" "}
                <strong>código</strong> rompe los acrílicos impresos. Solo cambiá el
                modelo de destino o la descripción.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Código corto *
                </label>
                <input
                  type="text"
                  value={form.codigo}
                  disabled={!!editing?.protegido}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      codigo: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  placeholder="vxl"
                  className="mt-1 w-full text-sm border border-gray-200 rounded-md py-2 px-3 font-mono focus:outline-none focus:ring-2 focus:ring-[#7ECAD6]/30 focus:border-[#7ECAD6] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Lo que va en la URL: <span className="font-mono">{baseUrl}/m/{form.codigo || "ejemplo"}</span>
                </p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Modelo destino
                </label>
                <select
                  value={form.modeloId}
                  onChange={(e) => setForm({ ...form, modeloId: e.target.value })}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#7ECAD6]/30 focus:border-[#7ECAD6]"
                >
                  <option value="">— Ninguno (usar URL custom) —</option>
                  {modelos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.marca} · {m.nombre}
                      {m.esUsado ? " (USADA)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {!form.modeloId && (
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-wide text-gray-600 font-medium">
                    URL custom (si no es un modelo)
                  </label>
                  <input
                    type="text"
                    value={form.urlCustom}
                    onChange={(e) => setForm({ ...form, urlCustom: e.target.value })}
                    placeholder="/promociones o https://otro-sitio.com"
                    className="mt-1 w-full text-sm border border-gray-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#7ECAD6]/30 focus:border-[#7ECAD6]"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-gray-600 font-medium">
                  Descripción (interno)
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Acrílico exposición Honda XR 150"
                  className="mt-1 w-full text-sm border border-gray-200 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#7ECAD6]/30 focus:border-[#7ECAD6]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo}
                  disabled={!!editing?.protegido}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                Activo (si lo desactivás, los QRs redirigen al catálogo)
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.protegido}
                  onChange={(e) => setForm({ ...form, protegido: e.target.checked })}
                />
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  <strong>Protegido</strong> — no se puede borrar, desactivar ni
                  cambiarle el código (para QRs impresos en carpas/acrílicos).
                </span>
              </label>
              {editing?.protegido && (
                <div className="md:col-span-2 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  🔒 QR protegido. El código y el estado están bloqueados. Podés
                  cambiar el destino y la descripción con tranquilidad. Para borrarlo o
                  cambiar el código, destildá "Protegido" primero.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="bg-emerald-600 hover:bg-emerald-700">
                Guardar
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de shortlinks */}
      {shortlinks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            Sin shortlinks todavía. Click en "Nuevo QR" para crear el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shortlinks.map((s) => {
            const url = `${baseUrl}/m/${s.codigo}`
            return (
              <Card
                key={s.id}
                className={
                  !s.activo
                    ? "opacity-60 border-dashed"
                    : s.protegido
                      ? "border-emerald-300 ring-1 ring-emerald-200"
                      : ""
                }
              >
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Preview QR */}
                    <div className="w-24 h-24 bg-white border rounded-md p-1 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/admin/qr/${s.id}/svg`}
                        alt={`QR ${s.codigo}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-mono text-base font-bold text-[#5BB5C2]">
                          /m/{s.codigo}
                        </h3>
                        {!s.activo && (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-600 border-gray-300"
                          >
                            Inactivo
                          </Badge>
                        )}
                        {s.protegido && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1"
                          >
                            <Lock className="h-3 w-3" /> Protegido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">
                        {s.modeloNombre ||
                          (s.urlCustom ? <span className="font-mono text-xs">{s.urlCustom}</span> : <span className="italic text-gray-400">sin destino</span>)}
                      </p>
                      {s.descripcion && (
                        <p className="text-xs text-gray-500 truncate">{s.descripcion}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>
                          <strong>{s.scans}</strong> scan{s.scans === 1 ? "" : "s"}
                        </span>
                        {s.ultimoScan && (
                          <span>Último: {formatDateTime(s.ultimoScan)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copiar(s)}
                      className="text-xs"
                    >
                      {copied === s.id ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copiar URL
                        </>
                      )}
                    </Button>
                    <a
                      href={`/api/admin/qr/${s.id}/svg`}
                      download={`motosfernandez-qr-${s.codigo}.svg`}
                      className="inline-flex items-center rounded-md border border-gray-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      <Download className="h-3 w-3 mr-1" /> SVG
                    </a>
                    <a
                      href={`/api/admin/qr/${s.id}/png?size=2048`}
                      download={`motosfernandez-qr-${s.codigo}-2048px.png`}
                      className="inline-flex items-center rounded-md border border-gray-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      <Download className="h-3 w-3 mr-1" /> PNG 2K
                    </a>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md border border-gray-300 dark:border-neutral-700 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                    </a>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProtegido(s)}
                        className={`h-7 w-7 p-0 ${s.protegido ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
                        title={s.protegido ? "Protegido — click para desbloquear" : "Proteger (bloquear)"}
                      >
                        {s.protegido ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(s)}
                        className="h-7 w-7 p-0"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminar(s)}
                        disabled={s.protegido}
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title={s.protegido ? "QR protegido — no se puede borrar" : "Eliminar"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Help footer */}
      <Card className="bg-gray-50/50 border-dashed">
        <CardContent className="py-4 text-xs text-gray-600 space-y-1.5">
          <p className="flex items-center gap-2 font-semibold text-gray-700">
            <QrCode className="h-4 w-4" /> Cómo funciona
          </p>
          <p>
            • La URL <span className="font-mono">{baseUrl}/m/&lt;código&gt;</span> es{" "}
            <strong>permanente</strong>: lo que va impreso en el acrílico no cambia.
          </p>
          <p>
            • Vos podés cambiar a qué modelo redirige cuando quieras (ej: si lanzás un
            modelo nuevo y querés que el QR de "vxl" apunte al nuevo).
          </p>
          <p>
            • Para imprimir en acrílico bajá el <strong>SVG</strong> (escala infinita,
            sin pérdida) o el <strong>PNG 2K</strong> si tu impresor pide PNG.
          </p>
          <p>
            • Vercel registra cada escaneo en <strong>scans</strong>, útil para saber
            qué moto genera más interés.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

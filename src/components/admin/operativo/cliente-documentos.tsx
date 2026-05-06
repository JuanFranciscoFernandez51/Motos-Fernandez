"use client"

import { useState, useRef } from "react"
import {
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  Download,
  Plus,
  Loader2,
  Folder,
  X,
} from "lucide-react"

export type ClienteDocumento = {
  id: string
  nombre: string
  categoria: "documentacion" | "domicilio" | "trabajo" | "garantia" | "otros"
  url: string
  publicId: string
  resourceType: "image" | "raw" | "video"
  mimeType: string
  tamano: number
  notas: string | null
  uploadedAt: string
}

const CATEGORIAS = [
  { value: "documentacion", label: "Documentación", icon: "📄", color: "blue" },
  { value: "domicilio", label: "Domicilio", icon: "🏠", color: "emerald" },
  { value: "trabajo", label: "Trabajo / Ingresos", icon: "💼", color: "amber" },
  { value: "garantia", label: "Garantía", icon: "📝", color: "purple" },
  { value: "otros", label: "Otros", icon: "📁", color: "gray" },
] as const

function formatTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function iconForType(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon
  if (mimeType === "application/pdf") return FileText
  return File
}

export function ClienteDocumentos({
  clienteId,
  documentosIniciales,
}: {
  clienteId: string
  documentosIniciales: ClienteDocumento[]
}) {
  const [docs, setDocs] = useState<ClienteDocumento[]>(documentosIniciales)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todos")
  const [showUpload, setShowUpload] = useState(false)
  const [pendingCategoria, setPendingCategoria] = useState<string>("documentacion")
  const [pendingNotas, setPendingNotas] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const docsFiltered =
    categoriaActiva === "todos"
      ? docs
      : docs.filter((d) => d.categoria === categoriaActiva)

  const conteoPorCategoria = CATEGORIAS.reduce<Record<string, number>>((acc, c) => {
    acc[c.value] = docs.filter((d) => d.categoria === c.value).length
    return acc
  }, {})

  async function uploadFile(file: File) {
    setUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("categoria", pendingCategoria)
      if (pendingNotas) formData.append("notas", pendingNotas)

      const res = await fetch(`/api/admin/clientes/${clienteId}/documentos`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data?.error || "Error al subir")
        return
      }
      setDocs((prev) => [...prev, data.documento])
      setPendingNotas("")
      setShowUpload(false)
    } catch {
      setError("Error de conexión")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleEliminar(docId: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(
        `/api/admin/clientes/${clienteId}/documentos?docId=${docId}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok || !data.ok) {
        alert(data?.error || "Error al eliminar")
        return
      }
      setDocs((prev) => prev.filter((d) => d.id !== docId))
    } catch {
      alert("Error de conexión")
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="size-5 text-[#6B4F7A]" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Documentos
            <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
              ({docs.length})
            </span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white text-xs font-semibold px-2.5 py-1.5 transition-colors"
        >
          {showUpload ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showUpload ? "Cancelar" : "Subir archivo"}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-lg border border-[#6B4F7A]/30 bg-[#6B4F7A]/5 p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Categoría
            </label>
            <select
              value={pendingCategoria}
              onChange={(e) => setPendingCategoria(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={pendingNotas}
              onChange={(e) => setPendingNotas(e.target.value)}
              placeholder="Ej: DNI vencido en 2030"
              className="w-full h-9 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-sm"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadFile(file)
            }}
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#6B4F7A]/40 bg-white dark:bg-neutral-900 hover:bg-[#6B4F7A]/5 px-4 py-6 text-sm font-medium text-[#6B4F7A] transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Plus className="size-5" />
                Click para elegir archivo (PDF o imagen, max 10MB)
              </>
            )}
          </button>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {/* Filtros por categoría */}
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoriaActiva("todos")}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
              categoriaActiva === "todos"
                ? "bg-[#6B4F7A] text-white"
                : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
            }`}
          >
            Todos ({docs.length})
          </button>
          {CATEGORIAS.filter((c) => conteoPorCategoria[c.value] > 0).map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategoriaActiva(c.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                categoriaActiva === c.value
                  ? "bg-[#6B4F7A] text-white"
                  : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700"
              }`}
            >
              {c.icon} {c.label} ({conteoPorCategoria[c.value]})
            </button>
          ))}
        </div>
      )}

      {/* Listado de documentos */}
      {docs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-neutral-800 p-8 text-center">
          <Folder className="size-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin documentos cargados todavía.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Subí DNI, comprobantes, garantías y todo lo que necesites archivar.
          </p>
        </div>
      ) : docsFiltered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No hay documentos en esta categoría.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {docsFiltered.map((doc) => {
            const Icon = iconForType(doc.mimeType)
            const cat = CATEGORIAS.find((c) => c.value === doc.categoria)
            return (
              <div
                key={doc.id}
                className="group rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex items-center gap-3 hover:border-[#6B4F7A]/30 hover:shadow-sm transition-all"
              >
                {/* Preview / Icon */}
                {doc.resourceType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doc.url}
                    alt={doc.nombre}
                    className="size-12 rounded object-cover bg-gray-100 dark:bg-neutral-800 shrink-0 cursor-pointer"
                    onClick={() => window.open(doc.url, "_blank")}
                  />
                ) : (
                  <div className="size-12 rounded bg-[#6B4F7A]/10 text-[#6B4F7A] flex items-center justify-center shrink-0">
                    <Icon className="size-6" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                    title={doc.nombre}
                  >
                    {doc.nombre}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <span>{cat?.icon}</span>
                    <span>{cat?.label}</span>
                    <span>·</span>
                    <span>{formatTamano(doc.tamano)}</span>
                  </p>
                  {doc.notas && (
                    <p
                      className="text-[10px] text-gray-500 dark:text-gray-400 italic truncate"
                      title={doc.notas}
                    >
                      {doc.notas}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-1 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-7 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-[#6B4F7A] hover:bg-[#6B4F7A]/10 transition-colors"
                    title="Abrir / Descargar"
                  >
                    <Download className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleEliminar(doc.id, doc.nombre)}
                    className="size-7 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-950/30 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

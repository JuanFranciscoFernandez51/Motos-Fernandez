"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2, Crop, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ImageCropperModal } from "./image-cropper-modal"

interface MultiImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  folder?: string
}

interface SortableItemProps {
  id: string
  url: string
  index: number
  onRemove: () => void
  onCrop: () => void
}

function SortableItem({ id, url, index, onRemove, onCrop }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Foto" className="w-full h-full object-cover" />

      {/* Badge "Portada" en la primera */}
      {index === 0 && (
        <span className="absolute top-1.5 left-1.5 bg-[#6B4F7A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          Portada
        </span>
      )}

      {/* Drag handle — siempre visible (en mobile no hay hover) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1.5 right-1.5 size-8 sm:size-7 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing touch-none sm:opacity-70 sm:group-hover:opacity-100 transition-opacity"
        aria-label="Mantené apretado y arrastrá para reordenar"
        title="Mantené apretado y arrastrá para reordenar"
      >
        <GripVertical className="size-4 sm:size-3.5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Action buttons — siempre visibles en mobile, con hover en desktop */}
      <div className="absolute bottom-1.5 right-1.5 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCrop()
          }}
          className="size-8 sm:size-7 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur flex items-center justify-center shadow-md hover:bg-blue-50 dark:bg-blue-950/30"
          aria-label="Recortar"
        >
          <Crop className="size-4 sm:size-3.5 text-blue-600" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="size-8 sm:size-7 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur flex items-center justify-center shadow-md hover:bg-red-50 dark:bg-red-950/30"
          aria-label="Eliminar"
        >
          <X className="size-4 sm:size-3.5 text-red-600" />
        </button>
      </div>
    </div>
  )
}

export function MultiImageUpload({ value, onChange, folder = "modelos" }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState("")
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperIndex, setCropperIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sensores: en desktop arrastra con el mouse al instante; en mobile se
  // requiere mantener apretado 200ms para distinguir drag de scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  /**
   * Comprime/redimensiona la imagen en el navegador antes de subirla.
   * - Vercel rechaza requests >4.5MB en serverless, asi que algunas fotos
   *   pesadas (HDR del iPhone, panoramicas) fallan con "error de conexion"
   *   antes de llegar al servidor. Comprimir client-side lo evita.
   * - Tambien acelera la subida desde redes lentas y reduce uso de Cloudinary.
   * - Si la foto es chica o no se puede procesar (ej HEIC en Chrome), se
   *   sube tal cual.
   */
  const compressInBrowser = async (file: File): Promise<File> => {
    // Si ya es chica (<1.5MB) y es JPEG/PNG/WebP, no hace falta comprimir
    if (file.size < 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/i.test(file.type)) {
      return file
    }
    // HEIC/HEIF de iPhone no se puede dibujar en canvas en navegadores
    // distintos a Safari. Mejor avisar y subir tal cual (Cloudinary lo acepta).
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      return file
    }

    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = dataUrl
      })

      const MAX = 2400
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return file
      ctx.drawImage(img, 0, 0, width, height)

      const blob: Blob | null = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
      })
      if (!blob) return file

      // Si quedo mas grande que el original (raro), usar el original
      if (blob.size >= file.size) return file

      const baseName = file.name.replace(/\.[^.]+$/, "")
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
    } catch {
      // Si algo falla en la compresion, intentar subir el original
      return file
    }
  }

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setError("")
    setUploading(true)
    setProgress({ current: 0, total: files.length })

    const uploaded: string[] = []
    const errores: string[] = []
    let done = 0

    for (const original of files) {
      try {
        // Hard cap: evitar subidas absurdas (>20MB) que igual van a fallar
        if (original.size > 20 * 1024 * 1024) {
          errores.push(`${original.name}: la foto pesa más de 20MB`)
          continue
        }

        // Comprime/redimensiona en el navegador antes de mandar al server
        const file = await compressInBrowser(original)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", folder)
        // "preserve": conserva el ratio original (4:3 del iPhone, vertical, etc.)
        // y limita el lado mayor a 2000px (fallback al server-side por las dudas).
        formData.append("cropMode", "preserve")

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        })

        // Si el server respondio pero no es JSON valido, manejarlo prolijamente
        let data: { url?: string; error?: string } = {}
        try {
          data = await res.json()
        } catch {
          errores.push(
            `${original.name}: respuesta inválida del servidor (HTTP ${res.status})`
          )
          continue
        }

        if (!res.ok || data.error) {
          errores.push(`${original.name}: ${data.error || `HTTP ${res.status}`}`)
        } else if (data.url) {
          uploaded.push(data.url)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sin detalle"
        errores.push(`${original.name}: error de conexión (${msg})`)
      } finally {
        done++
        setProgress({ current: done, total: files.length })
      }
    }

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded])
    }
    if (errores.length > 0) {
      setError(errores.join(" · "))
    }
    setUploading(false)
    setTimeout(() => setProgress({ current: 0, total: 0 }), 500)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
    uploadFiles(files)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    uploadFiles(files)
    e.target.value = "" // reset para poder subir el mismo archivo de nuevo
  }

  const handleRemove = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = value.findIndex((url) => url === active.id)
    const newIndex = value.findIndex((url) => url === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    onChange(arrayMove(value, oldIndex, newIndex))
  }

  const handleCropperSave = (newUrl: string) => {
    if (cropperIndex === null) return
    const updated = [...value]
    updated[cropperIndex] = newUrl
    onChange(updated)
    setCropperIndex(null)
  }

  // Filtrar URLs vacías para no romper sortable (necesita IDs únicos)
  const urls = value.filter((u) => u && u.trim())

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl p-8 hover:border-[#6B4F7A] hover:bg-[#6B4F7A]/5 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 min-h-[140px]"
      >
        {uploading ? (
          <>
            <Loader2 className="size-8 text-[#6B4F7A] animate-spin" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Subiendo {progress.current} de {progress.total}...
            </p>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#6B4F7A] h-full transition-all"
                style={{
                  width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "0%",
                }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="size-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Arrastrá fotos acá o hacé click para seleccionar
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Podés subir varias a la vez · Se conservan en su tamaño original (max 2000px)
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded p-2">{error}</p>
      )}

      {/* Grilla de fotos */}
      {urls.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={urls} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {urls.map((url, i) => (
                <SortableItem
                  key={url}
                  id={url}
                  url={url}
                  index={i}
                  onRemove={() => handleRemove(i)}
                  onCrop={() => {
                    setCropperIndex(i)
                    setCropperOpen(true)
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {urls.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {urls.length} foto{urls.length !== 1 ? "s" : ""} · Arrastrá las miniaturas para reordenar · La primera es la portada
        </p>
      )}

      {/* Modal de recorte */}
      {cropperIndex !== null && (
        <ImageCropperModal
          open={cropperOpen}
          imageUrl={value[cropperIndex]}
          folder={folder}
          onClose={() => {
            setCropperOpen(false)
            setCropperIndex(null)
          }}
          onSave={handleCropperSave}
        />
      )}
    </div>
  )
}

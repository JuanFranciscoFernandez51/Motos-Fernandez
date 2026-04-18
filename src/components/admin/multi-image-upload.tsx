"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2, Crop, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
      className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Foto" className="w-full h-full object-cover" />

      {/* Badge "Portada" en la primera */}
      {index === 0 && (
        <span className="absolute top-1.5 left-1.5 bg-[#6B4F7A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
          Portada
        </span>
      )}

      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1.5 right-1.5 size-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="size-3.5 text-gray-700" />
      </button>

      {/* Action buttons */}
      <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCrop()
          }}
          className="size-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:bg-blue-50"
          aria-label="Recortar"
        >
          <Crop className="size-3.5 text-blue-600" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="size-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:bg-red-50"
          aria-label="Eliminar"
        >
          <X className="size-3.5 text-red-600" />
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setError("")
    setUploading(true)
    setProgress({ current: 0, total: files.length })

    const uploaded: string[] = []
    let done = 0

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", folder)
        formData.append("cropMode", "auto") // recorte automático cuadrado al subir

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setError(data.error || `Error al subir ${file.name}`)
        } else {
          uploaded.push(data.url)
        }
      } catch {
        setError(`Error de conexión al subir ${file.name}`)
      } finally {
        done++
        setProgress({ current: done, total: files.length })
      }
    }

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded])
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
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-[#6B4F7A] hover:bg-[#6B4F7A]/5 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 min-h-[140px]"
      >
        {uploading ? (
          <>
            <Loader2 className="size-8 text-[#6B4F7A] animate-spin" />
            <p className="text-sm font-medium text-gray-700">
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
            <p className="text-sm font-medium text-gray-700">
              Arrastrá fotos acá o hacé click para seleccionar
            </p>
            <p className="text-xs text-gray-500">
              Podés subir varias a la vez · Se recortan automáticamente en cuadrado
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
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-2">{error}</p>
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
        <p className="text-xs text-gray-500">
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

"use client"

import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperModalProps {
  open: boolean
  imageUrl: string
  folder?: string
  onClose: () => void
  onSave: (newUrl: string) => void
}

async function getCroppedBlob(imageUrl: string, area: Area): Promise<Blob> {
  // Cargar la imagen original (sin transformaciones de Cloudinary)
  // Si la URL ya tiene transformaciones, usar la versión original removiendo el segmento c_fill,...
  const cleanUrl = imageUrl.replace(/\/upload\/[^/]*\//, "/upload/")

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = cleanUrl
  })

  const canvas = document.createElement("canvas")
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext("2d")!

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("No se pudo generar el recorte"))
    }, "image/jpeg", 0.92)
  })
}

export function ImageCropperModal({
  open,
  imageUrl,
  folder = "modelos",
  onClose,
  onSave,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Usar la URL original sin la transformación auto-fit para que el cropper trabaje
  // sobre la imagen completa
  const sourceUrl = imageUrl.replace(/\/upload\/[^/]*c_fill[^/]*\//, "/upload/")

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    setError("")
    try {
      const blob = await getCroppedBlob(sourceUrl, croppedAreaPixels)
      const formData = new FormData()
      formData.append("file", blob, "cropped.jpg")
      formData.append("folder", folder)
      formData.append("cropMode", "none") // ya viene recortado

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Error al guardar el recorte")
        setSaving(false)
        return
      }
      onSave(data.url)
      setSaving(false)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado"
      setError(msg)
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <h3 className="font-semibold text-base sm:text-lg">Recortar imagen</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors"
            disabled={saving}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Cropper — flex-1 para adaptarse al alto disponible.
            touch-none + overscroll-none evita que el browser robe el gesto
            (scroll/zoom de página) y deja que react-easy-crop maneje el drag.
            objectFit="cover": la foto siempre LLENA el cuadrado de recorte
            (sin bandas negras) y se puede arrastrar para elegir qué parte
            mantener. Subí el zoom para tener libertad en ambas direcciones. */}
        <div
          className="relative w-full flex-1 min-h-[300px] sm:min-h-[420px] bg-gray-900 touch-none overscroll-none"
          style={{ touchAction: "none" }}
        >
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={1}
            maxZoom={5}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="cover"
            showGrid
            restrictPosition
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-3 space-y-2 border-t border-gray-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={5}
              step={0.05}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#6B4F7A]"
            />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0 w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Arrastrá la foto con el mouse o un dedo para mover el encuadre · Subí el zoom si necesitás más libertad para mover hacia arriba/abajo
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="bg-[#6B4F7A] hover:bg-[#8B6F9A]"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar recorte"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

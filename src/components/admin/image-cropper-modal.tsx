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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-lg">Recortar imagen</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative w-full h-[400px] bg-gray-900">
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-3 border-t">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-gray-500">
            Arrastrá la imagen para reposicionar y usá el zoom para ajustar el encuadre.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
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

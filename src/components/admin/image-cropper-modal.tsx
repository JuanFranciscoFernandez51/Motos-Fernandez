"use client"

import { useState, useCallback, useEffect } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Loader2, X, Square, RectangleHorizontal, RectangleVertical, Image as ImageIcon } from "lucide-react"

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
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("No se pudo generar el recorte"))
      },
      "image/jpeg",
      0.92
    )
  })
}

type AspectPreset = {
  key: string
  label: string
  ratio: number | "natural"
  Icon: typeof Square
}

const PRESETS: AspectPreset[] = [
  { key: "natural", label: "Original", ratio: "natural", Icon: ImageIcon },
  { key: "1-1", label: "Cuadrada", ratio: 1, Icon: Square },
  { key: "4-3", label: "Apaisada", ratio: 4 / 3, Icon: RectangleHorizontal },
  { key: "3-4", label: "Vertical", ratio: 3 / 4, Icon: RectangleVertical },
]

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
  const [presetKey, setPresetKey] = useState<string>("natural")
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null)

  // URL original sin transformaciones de Cloudinary
  const sourceUrl = imageUrl.replace(/\/upload\/[^/]*c_fill[^/]*\//, "/upload/")

  // Detectar el ratio natural de la imagen al cargar
  useEffect(() => {
    if (!open) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => setNaturalRatio(img.width / img.height)
    img.src = sourceUrl
  }, [open, sourceUrl])

  // Reset crop/zoom cuando cambia el preset (para evitar áreas inválidas)
  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [presetKey])

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

  // Aspect efectivo del cropper
  const activePreset = PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0]
  const aspect: number =
    activePreset.ratio === "natural"
      ? naturalRatio ?? 1
      : activePreset.ratio

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

        {/* Selector de aspect ratio */}
        <div className="flex flex-wrap gap-1.5 px-5 py-2.5 border-b border-gray-100 dark:border-neutral-800 shrink-0 bg-gray-50 dark:bg-neutral-950">
          {PRESETS.map((p) => {
            const isActive = p.key === presetKey
            const Icon = p.Icon
            const isNatural = p.ratio === "natural"
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPresetKey(p.key)}
                disabled={isNatural && naturalRatio === null}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#6B4F7A] text-white"
                    : "bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-800"
                } disabled:opacity-50`}
              >
                <Icon className="size-3.5" />
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Cropper — flex-1 para adaptarse al alto disponible.
            objectFit="cover": la foto siempre llena el área de recorte sin
            bandas negras. Si elegís "Original", el aspect = ratio natural
            de la foto, así que zoom=1 muestra la foto completa sin recortar. */}
        <div
          className="relative w-full flex-1 min-h-[280px] sm:min-h-[400px] bg-gray-900 touch-none overscroll-none"
          style={{ touchAction: "none" }}
        >
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
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
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">
              Zoom
            </span>
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
            <span className="font-semibold text-gray-700 dark:text-gray-200">Original</span> conserva la foto completa sin recortar · Cambiá la forma o subí el zoom para encuadrar
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

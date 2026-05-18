"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  folder?: string
  className?: string
}

/**
 * Uploader de UNA imagen. Usa el patron signed-upload: pide firma al
 * server y sube directo a Cloudinary, bypass de Vercel. Antes usaba
 * /api/admin/upload (que pasaba por Vercel) y era muy lento + tenia
 * limites de payload (4.5MB) y timeout (10s sin maxDuration).
 */
export function ImageUpload({ value, onChange, folder = "productos", className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError("")
    setUploading(true)
    try {
      if (file.size > 50 * 1024 * 1024) {
        setError("La imagen pesa mas de 50MB")
        return
      }
      // 1) Pedir firma al server
      const signRes = await fetch("/api/admin/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      })
      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}))
        setError(err.error || "No se pudo firmar el upload")
        return
      }
      const sign = await signRes.json()

      // 2) Subir directo a Cloudinary
      const fd = new FormData()
      fd.append("file", file)
      fd.append("api_key", sign.apiKey)
      fd.append("timestamp", String(sign.timestamp))
      fd.append("signature", sign.signature)
      fd.append("folder", sign.folder)
      if (sign.transformation) fd.append("transformation", sign.transformation)
      if (sign.format) fd.append("format", sign.format)

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        { method: "POST", body: fd }
      )
      const cloudData = await cloudRes.json().catch(() => ({}))
      if (!cloudRes.ok || cloudData.error) {
        setError(
          cloudData?.error?.message || cloudData?.error || `HTTP ${cloudRes.status}`
        )
        return
      }
      if (cloudData.secure_url) {
        onChange(cloudData.secure_url)
      } else {
        setError("Respuesta de Cloudinary sin URL")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {value ? (
        <div className="relative aspect-square w-full max-w-[180px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-neutral-800"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-full p-0.5 shadow hover:bg-red-50 dark:bg-red-950/30 hover:border-red-300 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 hover:text-red-500" />
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-lg p-4 hover:border-[#6B4F7A] cursor-pointer transition-colors flex flex-col items-center justify-center gap-1 min-h-[100px]"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-[#6B4F7A] animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Subir imagen</span>
              <span className="text-xs text-gray-400">o pegar URL abajo</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Input
        placeholder="URL manual de imagen"
        value={value}
        onChange={(e) => {
          setError("")
          onChange(e.target.value)
        }}
        className="text-xs"
      />
    </div>
  )
}

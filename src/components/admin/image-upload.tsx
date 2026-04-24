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

export function ImageUpload({ value, onChange, folder = "productos", className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError("")
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Error al subir imagen")
      } else {
        onChange(data.url)
      }
    } catch {
      setError("Error de conexion al subir imagen")
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

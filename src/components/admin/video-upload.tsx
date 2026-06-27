"use client"

import { useRef, useState } from "react"
import { Upload, X, Loader2, Film } from "lucide-react"
import { Input } from "@/components/ui/input"

interface VideoUploadProps {
  value: string
  onChange: (url: string) => void
  /** Carpeta destino en Cloudinary. Default "videos-meta". */
  folder?: string
  /** Hint visual: "REEL" (vertical) o "VIDEO" (cualquier). Solo cambia el helper text. */
  hint?: "REEL" | "VIDEO"
  className?: string
}

/**
 * Uploader de video usando el mismo patrón signed-upload que ImageUpload.
 * Sube directo a Cloudinary (bypass del límite de 4.5MB / 10s de Vercel)
 * y devuelve la `secure_url` que se guarda en `ScheduledPost.videoUrls[]`.
 *
 * Cloudinary maneja MP4/MOV/WEBM y los devuelve compatibles con IG/FB.
 * El plan free tiene límite de 100MB por upload — para videos más largos
 * habría que partir o usar plan paid.
 */
export function VideoUpload({
  value,
  onChange,
  folder = "videos-meta",
  hint,
  className,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError("")
    setProgress(0)
    setUploading(true)
    try {
      // Cloudinary free tier: 100MB por upload. Si Francisco sube
      // videos más grandes, conviene comprimirlos antes o pasar a paid.
      if (file.size > 100 * 1024 * 1024) {
        setError("El video pesa más de 100MB. Comprimilo antes (ej: HandBrake).")
        return
      }

      // 1) Pedir firma al server (mismo endpoint que ImageUpload).
      //    El server-side debería responder con cloudName, apiKey,
      //    timestamp, signature, folder, etc.
      const signRes = await fetch("/api/admin/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // cropMode "none" → endpoint no agrega transformations de imagen
        // (c_limit, w_2000) que no aplican para video.
        body: JSON.stringify({ folder, cropMode: "none" }),
      })
      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}))
        setError(err.error || "No se pudo firmar el upload")
        return
      }
      const sign = await signRes.json()

      // 2) Subir directo al endpoint de video de Cloudinary.
      //    Importante: el resource_type del path tiene que ser "video"
      //    (no "image"). Usar XHR para tener progress real.
      const fd = new FormData()
      fd.append("file", file)
      fd.append("api_key", sign.apiKey)
      fd.append("timestamp", String(sign.timestamp))
      fd.append("signature", sign.signature)
      fd.append("folder", sign.folder)
      // Recurso video, no image
      const url = `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`

      const cloudData = await new Promise<{
        secure_url?: string
        error?: { message?: string }
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", url)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            reject(new Error("Cloudinary devolvió respuesta inválida"))
          }
        }
        xhr.onerror = () => reject(new Error("Error de red al subir video"))
        xhr.send(fd)
      })

      if (cloudData.error) {
        setError(cloudData.error.message || "Cloudinary rechazó el video")
        return
      }
      if (cloudData.secure_url) {
        onChange(cloudData.secure_url)
      } else {
        setError("Respuesta de Cloudinary sin URL")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir video")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const hintText =
    hint === "REEL"
      ? "Vertical 9:16, máx 90 segundos, MP4."
      : "MP4/MOV/WEBM, hasta 100MB."

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {value ? (
        <div className="relative w-full max-w-md">
          <video
            src={value}
            controls
            className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 bg-black"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-full p-1 shadow hover:bg-red-50 hover:border-red-300 transition-colors"
            title="Quitar video"
          >
            <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-200 dark:border-neutral-800 rounded-lg p-6 hover:border-[#7C3AED] cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 min-h-[120px]"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 text-[#7C3AED] animate-spin" />
              <span className="text-sm text-gray-600">
                Subiendo… {progress}%
              </span>
              <div className="w-full max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7C3AED] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Film className="h-7 w-7 text-gray-400" />
              <Upload className="h-4 w-4 text-gray-400 -mt-1" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Subí o arrastrá un video
              </span>
              <span className="text-xs text-gray-400 text-center max-w-xs">
                {hintText}
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Input
        placeholder="O pegá una URL de video"
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

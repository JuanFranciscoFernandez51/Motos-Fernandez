"use client"

import { useState, useRef } from "react"
import { ScanText, Loader2, Check, X, AlertCircle } from "lucide-react"

type TipoDocumento = "DNI" | "CEDULA_VERDE" | "CEDULA_AZUL" | "TITULO_AUTOMOTOR"

type OCRResultBase = {
  nombre?: string | null
  apellido?: string | null
  dni?: string | null
  fechaNacimiento?: string | null
  marca?: string | null
  modelo?: string | null
  anio?: number | null
  patente?: string | null
  chasis?: string | null
  motor?: string | null
  titularNombre?: string | null
  titularApellido?: string | null
  titularDni?: string | null
}

const TIPO_LABEL: Record<TipoDocumento, string> = {
  DNI: "DNI",
  CEDULA_VERDE: "Cédula verde",
  CEDULA_AZUL: "Cédula azul",
  TITULO_AUTOMOTOR: "Título automotor",
}

/**
 * Botón que abre un dialog donde el admin sube una foto de un documento
 * (DNI, cédula verde, etc) y se autocompletan los campos del form padre
 * con lo que detectó Claude Vision.
 *
 * Para que no rompa otros forms, todo va en un dialog modal aparte y se
 * llama `onResult` con los campos cuando el admin confirma. El form padre
 * decide qué hacer con cada campo (mergearlo, validar, etc).
 */
export function OcrDocButton({
  tipo,
  onResult,
  label,
}: {
  tipo: TipoDocumento
  onResult: (data: OCRResultBase) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [resultado, setResultado] = useState<OCRResultBase | null>(null)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPreview(null)
    setResultado(null)
    setError("")
    setLoading(false)
  }

  const cerrar = () => {
    setOpen(false)
    reset()
  }

  const procesarArchivo = async (file: File) => {
    setError("")
    setResultado(null)
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen es demasiado grande (max 10 MB)")
      return
    }
    // Preview
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      // Mandar al endpoint
      setLoading(true)
      try {
        const res = await fetch("/api/admin/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            imageBase64: dataUrl,
            mimeType: file.type || "image/jpeg",
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || `Error ${res.status}`)
          return
        }
        setResultado(data.data as OCRResultBase)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const confirmar = () => {
    if (resultado) onResult(resultado)
    cerrar()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[#6B4F7A]/40 bg-[#6B4F7A]/5 hover:bg-[#6B4F7A]/10 text-[#6B4F7A] px-2.5 py-1.5 text-xs font-medium"
        title={`Subir foto de ${TIPO_LABEL[tipo]} y autocompletar los campos`}
      >
        <ScanText className="size-3.5" />
        {label || `Scanear ${TIPO_LABEL[tipo]}`}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) cerrar()
          }}
        >
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ScanText className="size-4 text-[#6B4F7A]" />
                Escanear {TIPO_LABEL[tipo]}
              </h2>
              <button
                type="button"
                onClick={cerrar}
                disabled={loading}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {!preview && (
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-lg p-8 text-center cursor-pointer hover:border-[#6B4F7A] transition-colors"
                  onClick={() => inputRef.current?.click()}
                >
                  <ScanText className="size-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Click para subir una foto del {TIPO_LABEL[tipo].toLowerCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG o WebP — máx 10 MB
                  </p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) procesarArchivo(f)
                }}
              />

              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt="Documento"
                  className="w-full max-h-48 object-contain rounded-md border bg-gray-50 dark:bg-neutral-800"
                />
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300 py-4">
                  <Loader2 className="size-4 animate-spin" />
                  Leyendo el documento con IA...
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {resultado && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 p-3 space-y-1.5 text-sm">
                  <p className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-1 mb-2">
                    <Check className="size-4" />
                    Datos detectados:
                  </p>
                  {Object.entries(resultado)
                    .filter(([, v]) => v != null && v !== "")
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 capitalize w-28 shrink-0">
                          {k}:
                        </span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-2">
                    Revisá antes de confirmar. Si algo está mal, igual lo podés
                    editar en el formulario después.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50 dark:bg-neutral-900/60 rounded-b-xl">
              <button
                type="button"
                onClick={cerrar}
                disabled={loading}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              {preview && !resultado && !loading && (
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null)
                    setResultado(null)
                    setError("")
                  }}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  Probar otra
                </button>
              )}
              {resultado && (
                <button
                  type="button"
                  onClick={confirmar}
                  className="px-3 py-2 text-sm rounded-md bg-[#6B4F7A] hover:bg-[#8B6F9A] text-white inline-flex items-center gap-1.5"
                >
                  <Check className="size-4" />
                  Usar estos datos
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { v2 as cloudinary } from "cloudinary"

// Limpia la env var de espacios/tabs invisibles que a veces se cuelan al copy-paste
const cleanEnv = (v: string | undefined): string | undefined =>
  v ? v.trim().replace(/[\s\t\n\r]/g, "") || undefined : undefined

// Fallback entre las dos formas de declarar el cloud_name:
// - CLOUDINARY_CLOUD_NAME (server-only)
// - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (client + server)
const CLOUD_NAME =
  cleanEnv(process.env.CLOUDINARY_CLOUD_NAME) ||
  cleanEnv(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) ||
  "dgtlyzyra" // último recurso: el cloud actual hardcoded

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: cleanEnv(process.env.CLOUDINARY_API_KEY),
  api_secret: cleanEnv(process.env.CLOUDINARY_API_SECRET),
})

export async function uploadImage(
  file: Buffer | string,
  options?: {
    folder?: string
    transformation?: Record<string, unknown>[]
    cropMode?: "auto" | "none" | "preserve"
    format?: string
  }
) {
  const folder = options?.folder || "motos-fernandez"

  // Modos:
  // - "auto": recorta a cuadrado 1000x1000 detectando el sujeto. Pierde la
  //   foto original y solo deja el cuadrado. NO USAR para fotos que se van
  //   a recortar despues, porque el cropper no puede recuperar lo perdido.
  // - "preserve" (recomendado): NO recorta, solo limita el lado mayor a
  //   2000px y comprime con calidad auto. Conserva ratio original (4:3 del
  //   iPhone, etc.) y permite re-recortar despues sin perdida.
  // - "none": sube tal cual, sin transformaciones. Para casos especiales
  //   (cropper que ya recorta antes de subir).
  let transformation = options?.transformation
  if (!transformation) {
    if (options?.cropMode === "auto") {
      transformation = [
        { width: 1000, height: 1000, crop: "fill", gravity: "auto" },
      ]
    } else if (options?.cropMode === "preserve") {
      transformation = [
        { width: 2000, height: 2000, crop: "limit", quality: "auto:good" },
      ]
    }
  }

  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: "image" as const,
      transformation,
    }
    // Forzar formato de salida (ej: convertir HEIC -> JPG durante upload).
    if (options?.format) uploadOptions.format = options.format

    if (typeof file === "string") {
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) reject(error)
        else resolve({ url: result!.secure_url, publicId: result!.public_id })
      })
    } else {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error)
          else resolve({ url: result!.secure_url, publicId: result!.public_id })
        }
      )
      uploadStream.end(file)
    }
  })
}

export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId)
}

export default cloudinary

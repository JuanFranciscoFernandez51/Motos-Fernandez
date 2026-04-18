import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadImage(
  file: Buffer | string,
  options?: {
    folder?: string
    transformation?: Record<string, unknown>[]
    cropMode?: "auto" | "none"
  }
) {
  const folder = options?.folder || "motos-fernandez"

  // Si cropMode === "auto", aplicamos recorte cuadrado 1:1 detectando el sujeto
  let transformation = options?.transformation
  if (!transformation && options?.cropMode === "auto") {
    transformation = [
      { width: 1000, height: 1000, crop: "fill", gravity: "auto" },
    ]
  }

  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "image" as const,
      transformation,
    }

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

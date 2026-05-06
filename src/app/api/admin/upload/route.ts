import { NextRequest, NextResponse } from "next/server"
import { uploadImage } from "@/lib/cloudinary"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "productos"
    const cropMode = ((formData.get("cropMode") as string) || "preserve") as
      | "auto"
      | "none"
      | "preserve"

    if (!file) {
      return NextResponse.json({ error: "No se envio archivo" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Detectar HEIC/HEIF: si llegó tal cual del iPhone (porque heic2any
    // del cliente no pudo convertirlo), forzamos conversión a JPG para que
    // se pueda ver en navegadores no-Safari.
    const isHeic =
      /heic|heif/i.test(file.type) ||
      /\.hei[cf]$/i.test(file.name)

    const { url, publicId } = await uploadImage(buffer, {
      folder: `motos-fernandez/${folder}`,
      cropMode,
      format: isHeic ? "jpg" : undefined,
    })

    return NextResponse.json({ url, publicId })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error("Error uploading:", error)
    return NextResponse.json(
      { error: `Error al subir: ${msg}` },
      { status: 500 }
    )
  }
}

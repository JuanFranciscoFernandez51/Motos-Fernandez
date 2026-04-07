import { NextRequest, NextResponse } from "next/server"
import { uploadImage } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folder = (formData.get("folder") as string) || "productos"

    if (!file) {
      return NextResponse.json({ error: "No se envio archivo" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { url, publicId } = await uploadImage(buffer, {
      folder: `motos-fernandez/${folder}`,
    })

    return NextResponse.json({ url, publicId })
  } catch (error) {
    console.error("Error uploading:", error)
    return NextResponse.json(
      { error: "Error al subir imagen" },
      { status: 500 }
    )
  }
}

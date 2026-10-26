import { NextRequest, NextResponse } from "next/server"
import { uploadImage } from "@/lib/cloudinary"
import { mejorarFoto } from "@/lib/cloudinary-mejora"

export const maxDuration = 60

/**
 * "Mejorar" foto horneado: aplica e_improve UNA vez y sube el resultado como
 * asset nuevo. Devuelve la URL limpia (sin efecto en la URL), así el loader
 * de la web la sirve como cualquier foto. La original queda intacta.
 * Protegida por el middleware de /api/admin.
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = (await request.json()) as { url?: string }
    if (
      typeof url !== "string" ||
      !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)
    ) {
      return NextResponse.json({ error: "URL de Cloudinary inválida" }, { status: 400 })
    }
    // Sin otras transformaciones encima (ej. el cartel VENDIDO): solo originales.
    const resto = url.split("/upload/")[1]
    if (/^[a-z]{1,3}_/.test(resto) && !resto.startsWith("e_improve")) {
      return NextResponse.json(
        { error: "Esta foto ya tiene una transformación; mejorá la original" },
        { status: 400 }
      )
    }

    const { url: nueva } = await uploadImage(mejorarFoto(url), {
      folder: "motos-fernandez/modelos",
      cropMode: "none",
    })
    return NextResponse.json({ url: nueva })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error("Error horneando foto:", error)
    return NextResponse.json({ error: `No se pudo mejorar la foto: ${msg}` }, { status: 500 })
  }
}

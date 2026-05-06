import { NextResponse } from "next/server"
import cloudinary from "@/lib/cloudinary"
import { requireAdmin } from "@/lib/admin-auth"

/**
 * Devuelve los parámetros necesarios para que el cliente suba un archivo
 * DIRECTAMENTE a Cloudinary (bypassing Vercel y su límite de 4.5MB de body).
 *
 * Flujo:
 *  1. Cliente: POST /api/admin/upload-sign con {folder, format, cropMode}.
 *  2. Server (esto): firma los params con el api_secret y devuelve la firma.
 *  3. Cliente: arma FormData con {file, ...params, signature} y sube a
 *     https://api.cloudinary.com/v1_1/{cloud_name}/image/upload.
 *  4. Cloudinary devuelve {secure_url, public_id}.
 *
 * El api_secret nunca sale del server. La firma incluye un timestamp así
 * que solo es válida durante ~1h.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const folder = (body.folder as string) || "productos"
    const cropMode = (body.cropMode as string) || "preserve"
    const format = body.format as string | undefined

    // Construir la transformación según el cropMode (mismo criterio que el upload server-side)
    let transformation: string | undefined
    if (cropMode === "auto") {
      transformation = "c_fill,w_1000,h_1000,g_auto"
    } else if (cropMode === "preserve") {
      transformation = "c_limit,w_2000,h_2000,q_auto:good"
    }

    const timestamp = Math.round(Date.now() / 1000)
    const fullFolder = `motos-fernandez/${folder}`

    // Firmar los parámetros que va a usar el upload (orden alfabético).
    // IMPORTANTE: solo se firman los params que enviemos en el upload.
    const paramsToSign: Record<string, string | number> = {
      folder: fullFolder,
      timestamp,
    }
    if (transformation) paramsToSign.transformation = transformation
    if (format) paramsToSign.format = format

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      (process.env.CLOUDINARY_API_SECRET || "").trim()
    )

    return NextResponse.json({
      cloudName:
        (process.env.CLOUDINARY_CLOUD_NAME || "").trim() ||
        (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim(),
      apiKey: (process.env.CLOUDINARY_API_KEY || "").trim(),
      timestamp,
      signature,
      folder: fullFolder,
      transformation,
      format,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error firmando upload"
    console.error("[upload-sign]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

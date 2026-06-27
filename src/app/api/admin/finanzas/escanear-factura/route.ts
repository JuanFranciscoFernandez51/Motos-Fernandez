import { NextResponse } from "next/server"
import { escanearFacturaProductos } from "@/lib/escaneo-documentos"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * POST → recibe una factura (imagen o PDF) y devuelve los productos con su costo
 * y categoría, para que el calculador les aplique el markup.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Subí una factura (imagen o PDF)" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 10MB)" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await escanearFacturaProductos({
      nombre: file.name,
      mimeType: file.type || "application/octet-stream",
      base64: buffer.toString("base64"),
    })

    if (data.items.length === 0) {
      return NextResponse.json({ error: "No se detectaron productos en la factura" }, { status: 422 })
    }
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error analizando la factura"
    // Mensaje claro si se agotaron los créditos de IA
    const credito = /credit|balance|quota|rate limit/i.test(msg)
    return NextResponse.json(
      { error: credito ? "La IA no tiene créditos disponibles. Recargá la cuenta de Anthropic para leer facturas." : msg },
      { status: credito ? 402 : 500 }
    )
  }
}

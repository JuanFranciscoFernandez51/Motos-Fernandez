import { NextResponse } from "next/server"
import { extraerMovimientosBancarios } from "@/lib/escaneo-documentos"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 120

const MAX_BYTES = 12 * 1024 * 1024

/** POST (formData: file) → lee el extracto y devuelve los movimientos (preview, no inserta). */
export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Subí un extracto (Excel, PDF o imagen)" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 12MB)" }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const { movimientos } = await extraerMovimientosBancarios({
      nombre: file.name,
      mimeType: file.type || "application/octet-stream",
      base64: buffer.toString("base64"),
    })
    if (movimientos.length === 0) {
      return NextResponse.json({ error: "No se detectaron movimientos en el archivo" }, { status: 422 })
    }
    return NextResponse.json({ movimientos })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error analizando el extracto"
    const credito = /credit|balance|quota|rate limit/i.test(msg)
    return NextResponse.json(
      { error: credito ? "La IA no tiene créditos disponibles. Recargá la cuenta de Anthropic." : msg },
      { status: credito ? 402 : 500 }
    )
  }
}

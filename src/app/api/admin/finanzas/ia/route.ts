import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/finanzas/ia
 * body: { texto?: string, fileBase64?: string, mimeType?: string }
 * Lee una instrucción de texto, una factura (imagen) o un extracto (PDF/imagen)
 * y devuelve PROPUESTAS de movimientos para que el usuario revise y confirme.
 * NO crea nada en la DB.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const texto: string = (body.texto || "").trim()
  let fileBase64: string = body.fileBase64 || ""
  let mimeType: string = body.mimeType || ""
  if (fileBase64.startsWith("data:")) {
    const idx = fileBase64.indexOf(",")
    if (idx > 0) {
      if (!mimeType) mimeType = fileBase64.slice(5, idx).split(";")[0]
      fileBase64 = fileBase64.slice(idx + 1)
    }
  }
  if (!texto && !fileBase64) {
    return NextResponse.json({ error: "Mandá un texto o un archivo" }, { status: 400 })
  }

  const categorias = await prisma.categoriaFinanciera.findMany({
    where: { activa: true },
    orderBy: [{ tipo: "asc" }, { orden: "asc" }],
    select: { nombre: true, tipo: true },
  })
  const catsIng = categorias.filter((c) => c.tipo === "INGRESO").map((c) => c.nombre)
  const catsGas = categorias.filter((c) => c.tipo === "GASTO").map((c) => c.nombre)

  const hoy = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const prompt = `Sos el asistente contable de una concesionaria de motos en Argentina. Tu tarea es extraer movimientos de caja del contenido que te paso (texto, una factura o un extracto bancario) y devolverlos como JSON.

Categorías de INGRESO disponibles: ${catsIng.join(", ")}.
Categorías de GASTO disponibles: ${catsGas.join(", ")}.
Fecha de hoy: ${hoy}.

Devolvé SOLO un array JSON (sin texto adicional, sin markdown). Cada elemento:
{
  "tipo": "INGRESO" | "GASTO",
  "categoria": una de las categorías de la lista que mejor corresponda,
  "descripcion": breve (proveedor/concepto),
  "monto": número entero en pesos, SIN centavos, SIN separadores de miles (ej 50000),
  "moneda": "ARS" | "USD",
  "registrado": true salvo que el texto diga "en negro" / "sin factura" / "sin comprobante" → entonces false,
  "fecha": "YYYY-MM-DD" si la podés determinar, si no null
}
Si es un extracto con varias líneas, devolvé un elemento por movimiento relevante (ignorá saldos y encabezados). Si no estás seguro de la categoría, usá "Otros ingresos" u "Otros gastos". Si no hay ningún movimiento, devolvé [].`

  type Block =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"; data: string } }
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }

  const content: Block[] = [{ type: "text", text: prompt }]
  if (fileBase64) {
    if (mimeType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } })
    } else {
      const mm = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType) ? mimeType : "image/jpeg"
      content.push({ type: "image", source: { type: "base64", media_type: mm as "image/jpeg", data: fileBase64 } })
    }
  }
  if (texto) content.push({ type: "text", text: `Instrucción / contenido:\n${texto}` })

  try {
    const client = new Anthropic({ apiKey })
    const resp = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: content as never }],
    })
    const raw = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n")
    // Extraer el array JSON (puede venir con ```json)
    const match = raw.match(/\[[\s\S]*\]/)
    let movimientos: unknown[] = []
    if (match) {
      try { movimientos = JSON.parse(match[0]) } catch { movimientos = [] }
    }
    return NextResponse.json({ ok: true, movimientos })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error de IA" }, { status: 500 })
  }
}

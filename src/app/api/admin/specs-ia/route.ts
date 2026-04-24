import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"
export const maxDuration = 30

const SYSTEM_PROMPT = `Sos un experto en motocicletas con acceso a datos técnicos de todas las marcas. Tu única tarea es devolver las especificaciones técnicas de una moto específica en formato JSON.

REGLAS ESTRICTAS:
1. Devolvé SOLO un objeto JSON válido, SIN markdown, SIN bloques de código, SIN explicaciones.
2. Las CLAVES deben ser en español argentino con Mayúscula Inicial (ej: "Motor", "Potencia máxima").
3. Los VALORES deben ser strings cortos (máximo 50 caracteres) con unidades en formato argentino.
4. Si no estás 100% seguro de algún dato, OMITÍ esa clave. Mejor menos datos seguros que inventar.
5. Si el modelo/año no existe o no lo conocés, devolvé {}.
6. NO inventes datos. Si tenés dudas, omití.

CLAVES SUGERIDAS (usá solo las que sepas):
- "Motor" (ej: "Monocilíndrico 4T refrigerado por aire")
- "Cilindrada" (ej: "149.2 cc")
- "Potencia máxima" (ej: "12.4 HP @ 7500 rpm")
- "Torque máximo" (ej: "12.4 Nm @ 6000 rpm")
- "Alimentación" (ej: "Inyección electrónica PGM-FI")
- "Transmisión" (ej: "5 velocidades")
- "Arranque" (ej: "Eléctrico")
- "Freno delantero" (ej: "Disco 240mm con CBS")
- "Freno trasero" (ej: "Disco 220mm")
- "Suspensión delantera" (ej: "Horquilla telescópica")
- "Suspensión trasera" (ej: "Monoshock")
- "Rueda delantera" (ej: "19 pulgadas")
- "Rueda trasera" (ej: "17 pulgadas")
- "Capacidad de tanque" (ej: "12 litros")
- "Peso en orden de marcha" (ej: "130 kg")
- "Asiento (altura)" (ej: "825 mm")
- "Distancia entre ejes" (ej: "1375 mm")

FORMATO DE SALIDA (solo JSON puro, nada más):
{"Motor": "...", "Cilindrada": "...", ...}`

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "IA no configurada" }, { status: 503 })
  }

  let marca: string, modelo: string, anio: number | undefined
  try {
    const body = await request.json()
    marca = (body.marca || "").toString().trim()
    modelo = (body.modelo || "").toString().trim()
    anio = body.anio ? parseInt(String(body.anio)) : undefined
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  if (!marca || !modelo) {
    return NextResponse.json(
      { error: "marca y modelo son obligatorios" },
      { status: 400 }
    )
  }

  const userPrompt = `Dame las especificaciones técnicas de la siguiente moto:

Marca: ${marca}
Modelo: ${modelo}${anio ? `\nAño: ${anio}` : ""}

Devolvé SOLO el JSON con las specs que sepas con certeza.`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()

    // Limpiar posible markdown
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    let specs: Record<string, string>
    try {
      specs = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "La IA devolvió un formato inesperado. Probá de nuevo." },
        { status: 502 }
      )
    }

    // Validar que sea un objeto plano con strings
    if (typeof specs !== "object" || specs === null || Array.isArray(specs)) {
      return NextResponse.json(
        { error: "Formato inesperado" },
        { status: 502 }
      )
    }

    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(specs)) {
      if (typeof v === "string" && v.trim()) {
        clean[k] = v.trim()
      } else if (typeof v === "number") {
        clean[k] = String(v)
      }
    }

    return NextResponse.json({ specs: clean })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Error specs-ia:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

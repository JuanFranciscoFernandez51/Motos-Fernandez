import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * OCR de documentos vehiculares y de identidad usando Claude Vision.
 *
 * Tipos soportados:
 *  - DNI                  → nombre, apellido, dni, fechaNacimiento
 *  - CEDULA_VERDE         → marca, modelo, año, patente, chasis, motor, dni titular
 *  - CEDULA_AZUL          → idem cédula verde + datos del autorizado
 *  - TITULO_AUTOMOTOR     → marca, modelo, año, patente, chasis, motor, titular
 *
 * El cliente manda { tipo, imageBase64, mimeType } y se devuelve un JSON
 * con los campos detectados. Si la IA no puede leer algo, devuelve null
 * en ese campo (mejor que inventar).
 */

type TipoDocumento =
  | "DNI"
  | "CEDULA_VERDE"
  | "CEDULA_AZUL"
  | "TITULO_AUTOMOTOR"

const PROMPTS: Record<TipoDocumento, string> = {
  DNI: `Estás viendo un DNI argentino (frente o reverso). Extraé los siguientes campos:
- nombre: nombre/s de pila (sin apellido)
- apellido: apellido/s
- dni: número de documento, solo dígitos sin puntos (ej: "20123456")
- fechaNacimiento: en formato YYYY-MM-DD si está visible
- sexo: "M" o "F" si está visible

Reglas:
- Devolvé SOLO un objeto JSON, sin markdown ni explicación.
- Si un campo no es legible o no aparece en la imagen, ponelo en null.
- No inventes datos.

Formato: {"nombre": "...", "apellido": "...", "dni": "...", "fechaNacimiento": "...", "sexo": "M"}`,

  CEDULA_VERDE: `Estás viendo una cédula verde argentina (DNRPA). Extraé los siguientes campos del vehículo:
- marca: marca del fabricante (ej: "Honda", "Yamaha")
- modelo: modelo del vehículo (ej: "CB 150 Twister", "XR 150L")
- anio: año modelo como número (ej: 2023)
- patente: dominio/patente como aparece (ej: "AA123BB" o "ABC123")
- chasis: número de chasis completo
- motor: número de motor completo
- titularNombre: nombre del titular
- titularApellido: apellido del titular
- titularDni: DNI del titular sin puntos

Reglas:
- Devolvé SOLO un objeto JSON, sin markdown.
- Si un campo no es legible, ponelo en null.
- Patente y chasis en mayúsculas, sin espacios.
- No inventes datos.`,

  CEDULA_AZUL: `Estás viendo una cédula azul argentina (autorización de conducir). Extraé los datos del vehículo Y los datos del autorizado:
- marca, modelo, anio, patente, chasis, motor (igual que cédula verde)
- titularNombre, titularApellido, titularDni (el dueño del vehículo)
- autorizadoNombre, autorizadoApellido, autorizadoDni (la persona autorizada a manejar)

Reglas:
- JSON puro, sin markdown.
- null para campos no legibles.`,

  TITULO_AUTOMOTOR: `Estás viendo un Título del Automotor argentino. Extraé:
- marca, modelo, anio, patente, chasis, motor
- titularNombre, titularApellido, titularDni
- tipoVehiculo (ej: "MOTOCICLETA", "AUTOMOVIL")

Reglas:
- JSON puro, sin markdown.
- null para campos no legibles.`,
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "IA no configurada" }, { status: 503 })
  }

  let tipo: TipoDocumento
  let imageBase64: string
  let mimeType: string
  try {
    const body = await request.json()
    tipo = body.tipo as TipoDocumento
    imageBase64 = body.imageBase64 || ""
    mimeType = body.mimeType || "image/jpeg"
    // Algunos clientes mandan el dataURL completo "data:image/jpeg;base64,...."
    // — sacamos el prefijo si está.
    if (imageBase64.startsWith("data:")) {
      const idx = imageBase64.indexOf(",")
      if (idx > 0) imageBase64 = imageBase64.slice(idx + 1)
    }
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  if (!PROMPTS[tipo]) {
    return NextResponse.json(
      { error: `Tipo de documento no soportado: ${tipo}` },
      { status: 400 }
    )
  }
  if (!imageBase64 || imageBase64.length < 100) {
    return NextResponse.json(
      { error: "Falta la imagen (imageBase64)" },
      { status: 400 }
    )
  }

  // Claude Vision acepta image/jpeg, image/png, image/gif, image/webp
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  if (!allowedMimes.includes(mimeType)) {
    return NextResponse.json(
      { error: `MIME type no soportado: ${mimeType}` },
      { status: 400 }
    )
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      thinking: { type: "disabled" },
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: PROMPTS[tipo] },
          ],
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()

    // Limpiar markdown si vino
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    let data: Record<string, unknown>
    try {
      data = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "La IA devolvió un formato inesperado", raw: text },
        { status: 502 }
      )
    }

    // Normalizar patente y chasis a mayúsculas
    if (typeof data.patente === "string") {
      data.patente = data.patente.toUpperCase().replace(/\s/g, "")
    }
    if (typeof data.chasis === "string") {
      data.chasis = data.chasis.toUpperCase().replace(/\s/g, "")
    }
    if (typeof data.motor === "string") {
      data.motor = data.motor.toUpperCase().replace(/\s/g, "")
    }
    if (typeof data.dni === "string") {
      data.dni = data.dni.replace(/\D/g, "")
    }
    if (typeof data.titularDni === "string") {
      data.titularDni = (data.titularDni as string).replace(/\D/g, "")
    }

    return NextResponse.json({ ok: true, tipo, data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[ocr] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import Anthropic from "@anthropic-ai/sdk"
import { rateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

const SYSTEM_PROMPT = `Sos el asistente virtual de Motos Fernandez, la concesionaria multimarca mas importante de Bahia Blanca, ubicada en Brown 1052. Con mas de 40 anos en el mercado (desde 1985), vendemos y financiamos motocicletas, cuatriciclos, UTVs y motos de agua de las principales marcas: Honda, Yamaha, Kawasaki, Suzuki, CF Moto, Segway, entre otras. Tambien tenemos una tienda online de accesorios y repuestos.

HORARIOS:
- Lunes a Viernes: 8:30 a 12:30 y 15:30 a 19:30
- Sabados: 9:00 a 13:00
- Domingos: cerrado

CONTACTO:
- WhatsApp: 291 578-8671
- Email: info@motosfernandez.com.ar
- Instagram: @motos.fernandez
- Direccion: Brown 1052, Bahia Blanca, Buenos Aires

VEHICULOS QUE VENDEMOS:
- Motocicletas: urbanas, trail, enduro, naked, deportivas, scooters
- Cuatriciclos: todas las cilindradas, uso deportivo y utilitario
- UTV / Side by Side: para trabajo y aventura
- Motos de Agua / Jet ski: Yamaha, Kawasaki, entre otros

FINANCIACION: Ofrecemos planes propios y de las marcas, en cuotas, con o sin anticipo. Para consultas especificas de planes y tasas, derivar al WhatsApp.

SERVICIO TECNICO: Taller propio con mecanicos especializados. Turnos online disponibles en el sitio. Service, mantenimiento, reparaciones y pre-VTV.

TIENDA ONLINE: Accesorios, indumentaria y repuestos con envio a todo el pais. Pago con MercadoPago.

TU ROL: Ayudar con consultas sobre horarios, ubicacion, vehiculos, tramites, financiacion y servicio tecnico. Para precios y disponibilidad especifica, derivar al WhatsApp o al catalogo del sitio.

TONO: Amable, informal argentino (tutear), conciso. Respuestas cortas y naturales. No inventes precios ni datos que no tenes.`

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!rateLimit(ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Límite de mensajes alcanzado. Intentá de nuevo en un rato." }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "IA no configurada" }, { status: 503 })
  }

  let messages: Array<{ role: string; content: string }>

  try {
    const body = await request.json()
    messages = body.messages
  } catch {
    return NextResponse.json({ error: "Request invalido" }, { status: 400 })
  }

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "messages requerido" }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: messages as Array<{ role: "user" | "assistant"; content: string }>,
    })

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("")

    return NextResponse.json({ reply })
  } catch (err) {
    console.error("Error en chat:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

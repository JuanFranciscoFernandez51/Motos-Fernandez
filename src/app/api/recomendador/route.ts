import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"

// Marcas consideradas "primera línea" (japonesas, alemanas, italianas)
const PRIMERA_MARCA = [
  "honda",
  "yamaha",
  "suzuki",
  "kawasaki",
  "bmw",
  "ktm",
  "ducati",
  "vespa",
  "piaggio",
  "aprilia",
]

function esPrimeraMarca(marca: string | null | undefined): boolean {
  if (!marca) return false
  const m = marca.toLowerCase()
  return PRIMERA_MARCA.some((pm) => m.includes(pm))
}

type Respuestas = {
  uso?: string
  experiencia?: string
  presupuesto?: string
  marca?: string
  cilindrada?: string
  financiacion?: string
}

const SYSTEM_PROMPT = `Sos un asesor experto en motos de la concesionaria Motos Fernandez (Bahia Blanca, Argentina). Tu tarea es recomendar las 3 mejores motos para el usuario según su perfil, eligiendo SIEMPRE entre los modelos que te paso en el catálogo.

REGLAS IMPORTANTES:
1. Elegí SIEMPRE 3 modelos distintos, nunca menos. Si no hay coincidencia perfecta, elegí lo más cercano.
2. Las marcas de PRIMERA LÍNEA son: Honda, Yamaha, Suzuki, Kawasaki, BMW, KTM, Ducati, Vespa, Piaggio, Aprilia. Estas son siempre de mejor calidad, mejor durabilidad, mejor tecnología y mejor valor de reventa que las marcas económicas (Motomel, Zanella, Corven, Gilera, etc.).
3. Si el usuario eligió "primera marca" o "flexible": priorizá SIEMPRE marcas de primera línea. Solo usá marcas económicas si no hay NINGUNA primera marca en su presupuesto.
4. Si el usuario eligió "económica": podés recomendar marcas económicas, pero si hay una primera marca en su presupuesto, incluí al menos UNA para mostrar el valor.
5. Considerá el uso principal, experiencia, cilindrada y presupuesto para ajustar las recomendaciones.
6. Respetá el presupuesto cuando sea posible.

FORMATO DE SALIDA (MUY IMPORTANTE):
Respondé SOLO con un JSON válido, sin texto adicional, con esta forma exacta:
{"modelos":["id1","id2","id3"],"razonamiento":"explicación breve en español argentino (máximo 3 frases) de por qué se eligieron estas motos para este perfil"}

Usá los IDs exactos del catálogo. No inventes modelos.`

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown"
  if (!rateLimit(`recomendador:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Llegaste al límite de recomendaciones por hora. Probá de nuevo más tarde." },
      { status: 429 }
    )
  }

  let respuestas: Respuestas
  try {
    const body = await request.json()
    respuestas = body.respuestas || {}
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400 })
  }

  // Traer todos los modelos activos
  let modelosDB
  try {
    modelosDB = await prisma.modelo.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        slug: true,
        marca: true,
        categoriaVehiculo: true,
        condicion: true,
        cilindrada: true,
        precio: true,
        moneda: true,
        anio: true,
        fotos: true,
        destacado: true,
      },
      orderBy: [{ destacado: "desc" }, { orden: "asc" }],
    })
  } catch {
    return NextResponse.json(
      { error: "No pudimos leer el catálogo. Intentá de nuevo." },
      { status: 500 }
    )
  }

  if (modelosDB.length === 0) {
    return NextResponse.json(
      { error: "Todavía no hay modelos cargados en el catálogo." },
      { status: 404 }
    )
  }

  // Helper: armar fallback con 3 modelos de primera marca (o los que haya)
  const armarFallback = () => {
    const primeras = modelosDB.filter((m) => esPrimeraMarca(m.marca))
    const pool = primeras.length >= 3 ? primeras : modelosDB
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
    return shuffled.map((m) => m.id)
  }
  const expandirIds = (ids: string[]) =>
    ids
      .map((id) => modelosDB.find((m) => m.id === id))
      .filter((m): m is (typeof modelosDB)[number] => Boolean(m))

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Sin API key, devolvemos fallback
    const ids = armarFallback()
    return NextResponse.json({
      modelos: expandirIds(ids),
      razonamiento:
        "Te recomendamos estos 3 modelos de primera marca (Honda, Yamaha, Suzuki, Kawasaki, BMW, KTM, Ducati) por su durabilidad, tecnología y mejor valor de reventa.",
    })
  }

  // Formato compacto del catálogo para el modelo
  const catalogoCompacto = modelosDB.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    marca: m.marca,
    categoria: m.categoriaVehiculo,
    condicion: m.condicion || "0KM",
    cilindrada: m.cilindrada,
    precio: m.precio
      ? `${m.moneda || "ARS"} ${m.precio}`
      : "consultar",
    primera_marca: esPrimeraMarca(m.marca),
  }))

  const userMessage = `PERFIL DEL USUARIO:
- Uso principal: ${respuestas.uso || "no especificado"}
- Experiencia: ${respuestas.experiencia || "no especificada"}
- Presupuesto: ${respuestas.presupuesto || "no especificado"}
- Preferencia de marca: ${respuestas.marca || "no especificada"}
- Cilindrada preferida: ${respuestas.cilindrada || "no especificada"}
- Financiación: ${respuestas.financiacion || "no especificada"}

CATÁLOGO DISPONIBLE (${catalogoCompacto.length} modelos):
${JSON.stringify(catalogoCompacto)}

Elegí 3 modelos que mejor se adapten al perfil, respetando las reglas de priorización de primera marca. Respondé SOLO con el JSON.`

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()

    // Intentar parsear el JSON (limpiar por si vienen backticks o markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      const ids = armarFallback()
      return NextResponse.json({
        modelos: expandirIds(ids),
        razonamiento:
          "Te sugerimos estos modelos de primera marca por su excelente relación calidad/precio y su mejor valor de reventa.",
      })
    }

    let parsed: { modelos?: string[]; razonamiento?: string }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      const ids = armarFallback()
      return NextResponse.json({
        modelos: expandirIds(ids),
        razonamiento:
          "Te sugerimos estos modelos de primera marca por su excelente relación calidad/precio y su mejor valor de reventa.",
      })
    }

    // Validar que los IDs existan en el catálogo
    const validIds = new Set(modelosDB.map((m) => m.id))
    const idsValidos = (parsed.modelos || []).filter((id) => validIds.has(id))

    // Completar hasta 3 si faltan
    if (idsValidos.length < 3) {
      const fallback = armarFallback()
      for (const id of fallback) {
        if (idsValidos.length >= 3) break
        if (!idsValidos.includes(id)) idsValidos.push(id)
      }
    }

    const finalIds = idsValidos.slice(0, 3)
    const modelosCompletos = finalIds
      .map((id) => modelosDB.find((m) => m.id === id))
      .filter((m): m is (typeof modelosDB)[number] => Boolean(m))

    return NextResponse.json({
      modelos: modelosCompletos,
      razonamiento:
        parsed.razonamiento ||
        "Elegimos estas 3 motos pensando en tu perfil y en ofrecerte la mejor calidad posible.",
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error("Error en recomendador:", errorMessage)

    // Fallback ante cualquier error del LLM
    const ids = armarFallback()
    return NextResponse.json({
      modelos: expandirIds(ids),
      razonamiento:
        "Te recomendamos estos modelos de primera marca por su durabilidad, tecnología y mejor valor de reventa.",
    })
  }
}

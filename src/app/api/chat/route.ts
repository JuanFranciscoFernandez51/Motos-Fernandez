import Anthropic from "@anthropic-ai/sdk"
import { rateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

INSTRUCCIONES IMPORTANTES:
- Tenes herramientas para consultar el catalogo real de la concesionaria. USA LAS TOOLS siempre que te pregunten por modelos, productos, precios, stock o financiacion.
- Cuando muestres modelos o productos, incluí el link a la pagina: para modelos usa /catalogo/SLUG, para productos de tienda usa /tienda/SLUG.
- Cuando la tool devuelva un campo "foto" (URL de imagen), mostrá la imagen usando la sintaxis markdown: ![nombre del producto](URL). Solo usá esta sintaxis si la tool devolvió el campo "foto"; nunca inventes URLs de imágenes. Mostrá una imagen por modelo/producto destacado que estés recomendando.
- Mostrá precios reales. Si un modelo no tiene precio cargado, decí "consultanos por WhatsApp para el precio".
- Si hay oferta en un producto, mostrá el precio de oferta tachando el original.
- Para cerrar ventas o consultas mas detalladas, derivá al WhatsApp: 291 578-8671.
- No inventes datos. Si no encontrás resultados con las tools, decilo.

TONO: Amable, informal argentino (tutear), conciso. Respuestas cortas y naturales.`

const tools: Anthropic.Tool[] = [
  {
    name: "buscar_modelos",
    description:
      "Busca motos, cuatriciclos, UTVs o motos de agua en el catalogo. Puede filtrar por marca, categoria, condicion (0km/usada) o texto libre. Devuelve nombre, marca, categoria, condicion, año, km, cilindrada, precio y slug para el link.",
    input_schema: {
      type: "object" as const,
      properties: {
        busqueda: {
          type: "string",
          description: "Texto libre para buscar por nombre o marca. Ej: 'Honda', 'tornado', '250cc'. Opcional.",
        },
        categoria: {
          type: "string",
          description: "Filtrar por categoria: MOTOCICLETA, CUATRICICLO, UTV, MOTO_DE_AGUA. Opcional.",
        },
        marca: {
          type: "string",
          description: "Filtrar por marca exacta: Honda, Yamaha, Kawasaki, Suzuki, CF Moto, Segway, etc. Opcional.",
        },
        condicion: {
          type: "string",
          description: "Filtrar por condicion: '0KM' para nuevas, 'USADA' para usadas. Opcional.",
        },
      },
      required: [],
    },
  },
  {
    name: "ver_modelo",
    description:
      "Ve el detalle completo de un modelo especifico: specs, colores, fotos, precio y planes de financiacion del modelo.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: {
          type: "string",
          description: "El slug del modelo para buscar (ej: 'honda-xr-150'). Se obtiene de buscar_modelos.",
        },
        nombre: {
          type: "string",
          description: "Nombre del modelo si no se tiene el slug (ej: 'XR 150'). Busca por coincidencia parcial.",
        },
      },
      required: [],
    },
  },
  {
    name: "buscar_productos",
    description:
      "Busca accesorios, indumentaria y repuestos en la tienda online. Puede filtrar por nombre, categoria o moto compatible.",
    input_schema: {
      type: "object" as const,
      properties: {
        busqueda: {
          type: "string",
          description: "Texto libre para buscar por nombre. Ej: 'casco', 'guantes', 'aceite'. Opcional.",
        },
        categoria: {
          type: "string",
          description: "Nombre de la categoria. Ej: 'Cascos', 'Accesorios'. Opcional.",
        },
        moto_compatible: {
          type: "string",
          description: "Filtrar por moto compatible. Ej: 'Honda XR 150'. Opcional.",
        },
      },
      required: [],
    },
  },
  {
    name: "ver_categorias_tienda",
    description: "Lista todas las categorias de productos disponibles en la tienda online.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "ver_planes_financiacion",
    description: "Consulta los planes de financiacion disponibles con cuotas, coeficiente y anticipo minimo.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "ver_promociones",
    description: "Consulta las promociones vigentes de la concesionaria.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
]

function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR")}`
}

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case "buscar_modelos": {
      const busqueda = input.busqueda as string | undefined
      const categoria = input.categoria as string | undefined
      const marca = input.marca as string | undefined
      const condicion = input.condicion as string | undefined

      const where: Record<string, unknown> = { activo: true }
      if (condicion) where.condicion = condicion
      if (categoria) where.categoriaVehiculo = categoria
      if (marca) where.marca = { contains: marca, mode: "insensitive" }
      if (busqueda) {
        where.OR = [
          { nombre: { contains: busqueda, mode: "insensitive" } },
          { marca: { contains: busqueda, mode: "insensitive" } },
          { cilindrada: { contains: busqueda, mode: "insensitive" } },
        ]
      }

      const modelos = await prisma.modelo.findMany({
        where,
        select: {
          nombre: true,
          slug: true,
          marca: true,
          categoriaVehiculo: true,
          condicion: true,
          anio: true,
          kilometros: true,
          cilindrada: true,
          precio: true,
          moneda: true,
          destacado: true,
          fotos: true,
        },
        orderBy: [{ destacado: "desc" }, { orden: "asc" }],
        take: 15,
      })

      return {
        modelos: modelos.map((m) => ({
          nombre: m.nombre,
          slug: m.slug,
          marca: m.marca,
          categoria: m.categoriaVehiculo,
          condicion: m.condicion || "0KM",
          anio: m.anio,
          kilometros: m.kilometros,
          cilindrada: m.cilindrada,
          precio: m.precio
            ? (m.moneda || "ARS") === "USD"
              ? `USD ${m.precio.toLocaleString("es-AR")}`
              : formatPrice(m.precio)
            : "Consultar",
          destacado: m.destacado,
          foto: m.fotos && m.fotos.length > 0 ? m.fotos[0] : null,
          link: `/catalogo/${m.slug}`,
        })),
        total: modelos.length,
      }
    }

    case "ver_modelo": {
      const slug = input.slug as string | undefined
      const nombre = input.nombre as string | undefined

      let modelo
      if (slug) {
        modelo = await prisma.modelo.findFirst({
          where: { slug, activo: true },
          include: { colores: true },
        })
      } else if (nombre) {
        modelo = await prisma.modelo.findFirst({
          where: { nombre: { contains: nombre, mode: "insensitive" }, activo: true },
          include: { colores: true },
        })
      }

      if (!modelo) return { error: "Modelo no encontrado" }

      return {
        nombre: modelo.nombre,
        slug: modelo.slug,
        marca: modelo.marca,
        categoria: modelo.categoriaVehiculo,
        condicion: modelo.condicion || "0KM",
        anio: modelo.anio,
        kilometros: modelo.kilometros,
        observaciones: modelo.observaciones,
        cilindrada: modelo.cilindrada,
        precio: modelo.precio
          ? (modelo.moneda || "ARS") === "USD"
            ? `USD ${modelo.precio.toLocaleString("es-AR")}`
            : formatPrice(modelo.precio)
          : "Consultar",
        descripcion: modelo.descripcion,
        specs: modelo.specs,
        financiacion: modelo.financiacion,
        colores: modelo.colores.map((c) => c.nombre),
        fotos: modelo.fotos.length,
        foto: modelo.fotos.length > 0 ? modelo.fotos[0] : null,
        link: `/catalogo/${modelo.slug}`,
      }
    }

    case "buscar_productos": {
      const busqueda = input.busqueda as string | undefined
      const categoria = input.categoria as string | undefined
      const motoCompatible = input.moto_compatible as string | undefined

      const where: Record<string, unknown> = { activo: true }
      if (busqueda) {
        where.nombre = { contains: busqueda, mode: "insensitive" }
      }
      if (categoria) {
        where.categoria = { nombre: { contains: categoria, mode: "insensitive" } }
      }
      if (motoCompatible) {
        where.motoCompatible = { contains: motoCompatible, mode: "insensitive" }
      }

      const productos = await prisma.producto.findMany({
        where,
        select: {
          nombre: true,
          slug: true,
          precio: true,
          precioOferta: true,
          stock: true,
          talles: true,
          motoCompatible: true,
          fotos: true,
          categoria: { select: { nombre: true } },
        },
        orderBy: [{ destacado: "desc" }, { nombre: "asc" }],
        take: 15,
      })

      return {
        productos: productos.map((p) => ({
          nombre: p.nombre,
          slug: p.slug,
          precio: formatPrice(p.precio),
          precio_oferta: p.precioOferta ? formatPrice(p.precioOferta) : null,
          en_stock: p.stock > 0,
          stock: p.stock,
          talles: p.talles.length > 0 ? p.talles : null,
          moto_compatible: p.motoCompatible,
          categoria: p.categoria?.nombre,
          foto: p.fotos && p.fotos.length > 0 ? p.fotos[0] : null,
          link: `/tienda/${p.slug}`,
        })),
        total: productos.length,
      }
    }

    case "ver_categorias_tienda": {
      const categorias = await prisma.categoria.findMany({
        orderBy: { orden: "asc" },
        select: {
          nombre: true,
          _count: { select: { productos: { where: { activo: true } } } },
        },
      })

      return {
        categorias: categorias.map((c) => ({
          nombre: c.nombre,
          productos: c._count.productos,
        })),
      }
    }

    case "ver_planes_financiacion": {
      const planes = await prisma.planFinanciacion.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
        select: {
          nombre: true,
          tipo: true,
          cuotas: true,
          coeficiente: true,
          anticipoMinimo: true,
          descripcion: true,
        },
      })

      return {
        planes: planes.map((p) => ({
          nombre: p.nombre,
          tipo: p.tipo,
          cuotas: p.cuotas,
          coeficiente: p.coeficiente,
          anticipo_minimo: `${p.anticipoMinimo}%`,
          descripcion: p.descripcion,
        })),
        nota: "Para simular cuotas de un modelo especifico, usa la tool ver_modelo para ver planes del modelo.",
      }
    }

    case "ver_promociones": {
      const ahora = new Date()
      const promociones = await prisma.promocion.findMany({
        where: {
          activo: true,
          fechaInicio: { lte: ahora },
          fechaFin: { gte: ahora },
        },
        select: {
          titulo: true,
          descripcion: true,
          link: true,
          fechaFin: true,
        },
        orderBy: { fechaFin: "asc" },
      })

      return {
        promociones: promociones.map((p) => ({
          titulo: p.titulo,
          descripcion: p.descripcion,
          link: p.link,
          vence: p.fechaFin.toLocaleDateString("es-AR"),
        })),
        total: promociones.length,
      }
    }

    default:
      return { error: "Tool desconocida" }
  }
}

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
    let currentMessages = [...messages] as Anthropic.MessageParam[]

    // Agentic loop: si Claude necesita usar tools, ejecutarlas y volver a llamar
    let maxIterations = 5
    while (maxIterations > 0) {
      maxIterations--

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: currentMessages,
      })

      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
        )

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const toolUse of toolUseBlocks) {
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          )
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          })
        }

        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ]
        continue
      }

      // Respuesta final
      const reply = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("")

      return NextResponse.json({ reply })
    }

    return NextResponse.json({ reply: "Perdón, no pude procesar tu consulta. Intentá de nuevo." })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error("Error en chat:", errorMessage)

    // Errores transitorios de Anthropic (overload, rate limit) → mensaje amable
    if (/529|overloaded|overload_error|rate_limit|529/i.test(errorMessage)) {
      return NextResponse.json({
        reply: "Perdón, el asistente está un poco saturado en este momento. Probá de nuevo en unos segundos, o escribinos por WhatsApp al 291 578-8671.",
      })
    }

    return NextResponse.json({ error: "Error interno", detail: errorMessage }, { status: 500 })
  }
}

import Anthropic from "@anthropic-ai/sdk"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const SYSTEM_PROMPT = `Sos el asistente de gestión del panel de administración de Motos Fernandez (concesionaria de motos en Bahía Blanca).
Tenés acceso a la base de datos en tiempo real a través de tools.

Capacidades:
- LECTURA: get_stats, get_pedidos, get_leads, get_turnos, get_productos_stock_bajo, get_ventas_resumen
- PROPUESTAS DE CREACIÓN (no crean directo, hacen una preview que el admin debe confirmar):
  - proponer_crear_cliente: cuando te pasen un DNI, factura, o datos de un cliente
  - proponer_crear_proveedor: cuando te pasen datos de un proveedor (nombre, CUIT, contacto, cuenta bancaria, etc.)
  - proponer_crear_modelo: cuando te pasen una factura/documento de una moto nueva o usada para subir al stock

REGLAS IMPORTANTES:
- Si te mandan una imagen (foto de DNI, factura, remito, ticket), analizala con cuidado y extraé los datos relevantes.
- Para crear cualquier cosa, SIEMPRE usá una tool de "proponer_crear_*" — NUNCA inventes datos.
- Si los datos están incompletos, igual proponé la creación con lo que tengas (el admin completa lo que falta antes de confirmar).
- Después de proponer una creación, NO confirmes ni asumas que se creó. Esperá la confirmación del usuario.
- Respondé siempre en español argentino informal, conciso y directo.
- Cuando muestres listas, usá bullet points o numeración.`

const tools: Anthropic.Tool[] = [
  // ============ LECTURA ============
  {
    name: "get_stats",
    description:
      "Obtiene estadísticas generales: modelos activos, productos en la tienda, pedidos de hoy, leads de hoy, turnos pendientes y visitas de hoy.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pedidos",
    description:
      "Obtiene pedidos con filtro opcional por estado o fecha. Devuelve los más recientes.",
    input_schema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Cantidad de pedidos a traer. Por defecto 10.",
        },
        estado: {
          type: "string",
          description:
            "Filtrar por estado: NUEVO, PAGO_CONFIRMADO, PREPARANDO, ENVIADO, ENTREGADO, CANCELADO. Opcional.",
        },
        solo_hoy: {
          type: "boolean",
          description: "Si es true, solo trae pedidos de hoy.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_leads",
    description:
      "Obtiene leads del CRM con nombre, fuente de origen y temperatura.",
    input_schema: {
      type: "object",
      properties: {
        limite: { type: "number", description: "Cantidad. Por defecto 10." },
        temperatura: {
          type: "string",
          description: "Filtrar: FRIO, TIBIO, CALIENTE. Opcional.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_turnos",
    description: "Obtiene turnos de servicio.",
    input_schema: {
      type: "object",
      properties: {
        limite: { type: "number" },
        estado: {
          type: "string",
          description: "PENDIENTE | CONFIRMADO | COMPLETADO | CANCELADO",
        },
        proximos: { type: "boolean" },
      },
      required: [],
    },
  },
  {
    name: "get_productos_stock_bajo",
    description: "Productos con stock <= 5.",
    input_schema: {
      type: "object",
      properties: {
        limite_stock: { type: "number", description: "Por defecto 5." },
      },
      required: [],
    },
  },
  {
    name: "get_ventas_resumen",
    description: "Resumen de ventas: total recaudado, pedidos pagados, ticket promedio.",
    input_schema: {
      type: "object",
      properties: {
        periodo: {
          type: "string",
          description: "'hoy', 'semana', 'mes'. Por defecto 'mes'.",
        },
      },
      required: [],
    },
  },
  // ============ PROPUESTAS DE CREACIÓN ============
  {
    name: "proponer_crear_cliente",
    description:
      "Propone crear un nuevo cliente. NO crea directamente — solo arma una preview con los datos extraídos para que el admin confirme. Usar cuando el admin te pase un DNI, datos personales, o información de un cliente nuevo.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre/s de pila" },
        apellido: { type: "string", description: "Apellido/s" },
        dni: { type: "string", description: "DNI sin puntos. Solo dígitos." },
        cuit: { type: "string", description: "CUIT con guiones (formato 20-12345678-9)" },
        email: { type: "string" },
        telefono: { type: "string" },
        direccion: { type: "string" },
        ciudad: { type: "string", description: "Default: Bahía Blanca" },
        provincia: { type: "string" },
        codigoPostal: { type: "string" },
        fechaNacimiento: {
          type: "string",
          description: "ISO date YYYY-MM-DD",
        },
        ocupacion: { type: "string" },
        notasInternas: {
          type: "string",
          description:
            "Notas internas (ej: 'Datos extraídos de DNI', 'Cargado desde factura X')",
        },
      },
      required: ["nombre", "apellido"],
    },
  },
  {
    name: "proponer_crear_proveedor",
    description:
      "Propone crear un nuevo proveedor. NO crea directamente. Usar cuando te pasen razón social, CUIT, datos de contacto, datos de cuenta bancaria de un proveedor nuevo.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Razón social o nombre comercial" },
        cuit: { type: "string" },
        rubro: { type: "string", description: "Ej: Motos 0km, Repuestos, Cascos" },
        email: { type: "string" },
        sitio: { type: "string" },
        direccion: { type: "string" },
        ciudad: { type: "string" },
        notas: { type: "string" },
        contactos: {
          type: "array",
          description: "Lista de contactos del proveedor",
          items: {
            type: "object",
            properties: {
              nombre: { type: "string" },
              rol: { type: "string", description: "Ej: Comercial, Administración, Vendedor" },
              telefono: { type: "string" },
              email: { type: "string" },
            },
          },
        },
        cuentasBancarias: {
          type: "array",
          description: "Lista de cuentas bancarias",
          items: {
            type: "object",
            properties: {
              banco: { type: "string" },
              tipo: { type: "string", description: "CA | CC | VIRTUAL" },
              numero: { type: "string" },
              cbu: { type: "string", description: "22 dígitos sin espacios" },
              alias: { type: "string" },
              titular: { type: "string" },
              moneda: { type: "string", description: "ARS | USD" },
            },
          },
        },
      },
      required: ["nombre"],
    },
  },
  {
    name: "proponer_crear_modelo",
    description:
      "Propone crear un nuevo modelo de moto/cuatri/UTV en el catálogo. NO crea directamente. Usar cuando te pasen una factura de compra o datos de una unidad nueva o usada para subir al stock.",
    input_schema: {
      type: "object",
      properties: {
        marca: { type: "string", description: "Honda, Yamaha, Suzuki, etc." },
        nombre: { type: "string", description: "Nombre del modelo (ej: XR150L, MT-03)" },
        categoriaVehiculo: {
          type: "string",
          description: "MOTOCICLETA | CUATRICICLO | UTV | MOTO_DE_AGUA. Default: MOTOCICLETA",
        },
        condicion: {
          type: "string",
          description: "0KM | USADA. Default: 0KM",
        },
        anio: { type: "number" },
        kilometros: { type: "number", description: "Solo para usadas" },
        cilindrada: { type: "string", description: "Ej: 150cc, 250cc" },
        precio: { type: "number" },
        moneda: { type: "string", description: "ARS | USD. Default: ARS" },
        chasis: { type: "string", description: "Nº de chasis" },
        motor: { type: "string", description: "Nº de motor" },
        patente: { type: "string", description: "Solo si usada y patentada" },
        observaciones: { type: "string" },
      },
      required: ["marca", "nombre"],
    },
  },
]

function getStartOfPeriod(periodo: string): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (periodo === "hoy") return now
  if (periodo === "semana") {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  const d = new Date(now)
  d.setDate(1)
  return d
}

async function executeTool(name: string, input: Record<string, unknown>) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // ============ TOOLS DE PROPUESTA ============
  // Estas no crean nada — solo devuelven el payload para que el frontend
  // muestre una preview de confirmación.
  if (name.startsWith("proponer_crear_")) {
    const entidad = name.replace("proponer_crear_", "")
    return {
      __preview__: true,
      entidad, // "cliente" | "proveedor" | "modelo"
      datos: input,
    }
  }

  switch (name) {
    case "get_stats": {
      const [modelos, productos, pedidosHoy, leadsHoy, turnosPendientes, visitasHoy] =
        await Promise.all([
          prisma.modelo.count({ where: { activo: true } }),
          prisma.producto.count({ where: { activo: true } }),
          prisma.pedido.count({ where: { createdAt: { gte: hoy } } }),
          prisma.lead.count({ where: { createdAt: { gte: hoy } } }),
          prisma.turno.count({ where: { estado: "PENDIENTE" } }),
          prisma.visita.count({ where: { createdAt: { gte: hoy } } }),
        ])
      return {
        modelos_activos: modelos,
        productos_activos: productos,
        pedidos_hoy: pedidosHoy,
        leads_hoy: leadsHoy,
        turnos_pendientes: turnosPendientes,
        visitas_hoy: visitasHoy,
      }
    }

    case "get_pedidos": {
      const limite = (input.limite as number) || 10
      const soloHoy = input.solo_hoy as boolean | undefined
      const estado = input.estado as string | undefined
      const where: Record<string, unknown> = {}
      if (soloHoy) where.createdAt = { gte: hoy }
      if (estado) where.estado = estado
      const pedidos = await prisma.pedido.findMany({
        take: limite,
        where,
        orderBy: { createdAt: "desc" },
        select: {
          numero: true,
          nombre: true,
          apellido: true,
          total: true,
          estado: true,
          estadoPago: true,
          createdAt: true,
        },
      })
      return {
        pedidos: pedidos.map((p) => ({
          numero: p.numero,
          cliente: `${p.nombre} ${p.apellido}`,
          total: `$${p.total.toLocaleString("es-AR")}`,
          estado: p.estado,
          estado_pago: p.estadoPago,
          fecha: p.createdAt.toLocaleDateString("es-AR"),
        })),
        total_mostrados: pedidos.length,
      }
    }

    case "get_leads": {
      const limite = (input.limite as number) || 10
      const temperatura = input.temperatura as string | undefined
      const where: Record<string, unknown> = {}
      if (temperatura) where.temperatura = temperatura
      const leads = await prisma.lead.findMany({
        take: limite,
        where,
        orderBy: { createdAt: "desc" },
        select: {
          nombre: true,
          apellido: true,
          telefono: true,
          origen: true,
          temperatura: true,
          etapa: true,
          modeloInteres: true,
          createdAt: true,
        },
      })
      return {
        leads: leads.map((l) => ({
          cliente: `${l.nombre} ${l.apellido || ""}`.trim(),
          telefono: l.telefono || "—",
          origen: l.origen,
          temperatura: l.temperatura,
          etapa: l.etapa,
          interes: l.modeloInteres || "—",
          fecha: l.createdAt.toLocaleDateString("es-AR"),
        })),
        total: leads.length,
      }
    }

    case "get_turnos": {
      const limite = (input.limite as number) || 10
      const estado = input.estado as string | undefined
      const proximos = input.proximos as boolean | undefined
      const where: Record<string, unknown> = {}
      if (estado) where.estado = estado
      if (proximos) where.fechaConfirmada = { gte: new Date() }
      const turnos = await prisma.turno.findMany({
        take: limite,
        where,
        orderBy: { createdAt: "desc" },
        select: {
          nombre: true,
          telefono: true,
          modeloMoto: true,
          tipoServicio: true,
          fechaConfirmada: true,
          estado: true,
        },
      })
      return {
        turnos: turnos.map((t) => ({
          cliente: t.nombre,
          telefono: t.telefono,
          moto: t.modeloMoto || "—",
          servicio: t.tipoServicio,
          fecha: t.fechaConfirmada
            ? t.fechaConfirmada.toLocaleDateString("es-AR")
            : "Sin fecha",
          estado: t.estado,
        })),
      }
    }

    case "get_productos_stock_bajo": {
      const limite = (input.limite_stock as number) || 5
      const productos = await prisma.producto.findMany({
        where: { activo: true, stock: { lte: limite } },
        orderBy: { stock: "asc" },
        take: 20,
        select: { nombre: true, stock: true, precio: true },
      })
      return {
        productos: productos.map((p) => ({
          nombre: p.nombre,
          stock: p.stock,
          precio: `$${p.precio.toLocaleString("es-AR")}`,
        })),
      }
    }

    case "get_ventas_resumen": {
      const periodo = (input.periodo as string) || "mes"
      const desde = getStartOfPeriod(periodo)
      const pedidos = await prisma.pedido.findMany({
        where: {
          estadoPago: "APROBADO",
          createdAt: { gte: desde },
        },
        select: { total: true },
      })
      const totalRecaudado = pedidos.reduce((s, p) => s + p.total, 0)
      const cantidad = pedidos.length
      const promedio = cantidad > 0 ? Math.round(totalRecaudado / cantidad) : 0
      return {
        periodo,
        total_recaudado: `$${totalRecaudado.toLocaleString("es-AR")}`,
        pedidos_pagados: cantidad,
        ticket_promedio: `$${promedio.toLocaleString("es-AR")}`,
      }
    }

    default:
      return { error: "Tool desconocida" }
  }
}

// ==================== TYPES PARA INPUT ====================

type ImageBlock = {
  type: "image"
  source: {
    type: "base64"
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    data: string
  }
}

type IncomingMessage = {
  role: "user" | "assistant"
  content: string | Array<{ type: "text"; text: string } | ImageBlock>
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "IA no configurada" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  let messages: IncomingMessage[]

  try {
    const body = await request.json()
    messages = body.messages
  } catch {
    return new Response(JSON.stringify({ error: "Request inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const client = new Anthropic({ apiKey })
  const encoder = new TextEncoder()

  // Helper para enviar eventos NDJSON al cliente
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      }

      try {
        let currentMessages = messages.map((m) => ({
          role: m.role,
          content: m.content,
        })) as Anthropic.MessageParam[]

        // Agentic loop para manejar tool use
        while (true) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 2048,
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

              // Si la tool devolvió una "preview", la mandamos al cliente
              if (
                result &&
                typeof result === "object" &&
                "__preview__" in result &&
                result.__preview__ === true
              ) {
                send({
                  type: "preview",
                  entidad: (result as { entidad: string }).entidad,
                  datos: (result as { datos: unknown }).datos,
                })
              }

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

          // Respuesta final: streamear texto
          for (const block of response.content) {
            if (block.type === "text") {
              const text = block.text
              const chunkSize = 32
              for (let i = 0; i < text.length; i += chunkSize) {
                send({ type: "text", text: text.slice(i, i + chunkSize) })
              }
            }
          }
          send({ type: "done" })
          break
        }
      } catch (err) {
        console.error("[admin/chat] Error:", err)
        send({
          type: "text",
          text: "Error al procesar la consulta. Intentá de nuevo.",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  })
}

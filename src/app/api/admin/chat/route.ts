import Anthropic from "@anthropic-ai/sdk"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const SYSTEM_PROMPT = `Sos el asistente de gestión del panel de administración de Motos Fernandez.
Tenés acceso a la base de datos en tiempo real a través de tools.
Respondé de forma concisa, directa y útil. Usá formato claro con números cuando sea relevante.
Si necesitás datos actualizados, usá las tools disponibles antes de responder.
Cuando muestres listas, usá bullet points o numeración.
Respondé siempre en español argentino informal.`

const tools: Anthropic.Tool[] = [
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
      "Obtiene leads del CRM con nombre, fuente de origen y temperatura. Puede filtrar por temperatura o etapa.",
    input_schema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Cantidad de leads a traer. Por defecto 10.",
        },
        temperatura: {
          type: "string",
          description: "Filtrar por temperatura: FRIO, TIBIO, CALIENTE. Opcional.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_turnos",
    description:
      "Obtiene los turnos de servicio con nombre del cliente, modelo, tipo de servicio y estado.",
    input_schema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Cantidad de turnos a traer. Por defecto 10.",
        },
        estado: {
          type: "string",
          description:
            "Filtrar por estado: PENDIENTE, CONFIRMADO, COMPLETADO, CANCELADO. Opcional.",
        },
        proximos: {
          type: "boolean",
          description:
            "Si es true, solo trae turnos con fecha confirmada en el futuro.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_productos_stock_bajo",
    description: "Obtiene los productos de la tienda con stock menor o igual a 5.",
    input_schema: {
      type: "object",
      properties: {
        limite_stock: {
          type: "number",
          description: "Stock máximo a considerar como bajo. Por defecto 5.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_ventas_resumen",
    description:
      "Obtiene un resumen de ventas: total recaudado en el período, cantidad de pedidos pagados, ticket promedio.",
    input_schema: {
      type: "object",
      properties: {
        periodo: {
          type: "string",
          description:
            "Período a consultar: 'hoy', 'semana', 'mes'. Por defecto 'mes'.",
        },
      },
      required: [],
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
  // mes
  const d = new Date(now)
  d.setDate(1)
  return d
}

async function executeTool(name: string, input: Record<string, unknown>) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

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
          ciudad: true,
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
          ciudad: p.ciudad || "—",
          fecha: p.createdAt.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
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
          nombre: `${l.nombre}${l.apellido ? " " + l.apellido : ""}`,
          telefono: l.telefono || "—",
          origen: l.origen,
          temperatura: l.temperatura,
          etapa: l.etapa,
          modelo_interes: l.modeloInteres || null,
          fecha: l.createdAt.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
          }),
        })),
        total_mostrados: leads.length,
      }
    }

    case "get_turnos": {
      const limite = (input.limite as number) || 10
      const estado = input.estado as string | undefined
      const proximos = input.proximos as boolean | undefined

      const where: Record<string, unknown> = {}
      if (estado) where.estado = estado
      if (proximos) {
        where.fechaConfirmada = { gte: new Date() }
      }

      const turnos = await prisma.turno.findMany({
        take: limite,
        where,
        orderBy: proximos ? { fechaConfirmada: "asc" } : { createdAt: "desc" },
        include: { modelo: { select: { nombre: true } } },
      })
      return {
        turnos: turnos.map((t) => ({
          nombre: t.nombre,
          telefono: t.telefono,
          modelo: t.modelo?.nombre || t.modeloMoto || "—",
          tipo_servicio: t.tipoServicio,
          estado: t.estado,
          fecha_confirmada: t.fechaConfirmada
            ? t.fechaConfirmada.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })
            : "Sin confirmar",
          solicitud: t.createdAt.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
          }),
        })),
        total_mostrados: turnos.length,
      }
    }

    case "get_productos_stock_bajo": {
      const limiteStock = (input.limite_stock as number) || 5
      const productos = await prisma.producto.findMany({
        where: { stock: { lte: limiteStock }, activo: true },
        select: {
          nombre: true,
          stock: true,
          precio: true,
          categoria: { select: { nombre: true } },
        },
        orderBy: { stock: "asc" },
        take: 20,
      })
      return {
        productos: productos.map((p) => ({
          nombre: p.nombre,
          stock: p.stock,
          precio: `$${p.precio.toLocaleString("es-AR")}`,
          categoria: p.categoria?.nombre || "Sin categoría",
        })),
        total: productos.length,
      }
    }

    case "get_ventas_resumen": {
      const periodo = (input.periodo as string) || "mes"
      const desde = getStartOfPeriod(periodo)

      const pedidosPagados = await prisma.pedido.findMany({
        where: {
          createdAt: { gte: desde },
          estadoPago: "APROBADO",
        },
        select: { total: true },
      })

      const totalRecaudado = pedidosPagados.reduce((acc, p) => acc + p.total, 0)
      const ticketPromedio =
        pedidosPagados.length > 0
          ? Math.round(totalRecaudado / pedidosPagados.length)
          : 0

      return {
        periodo,
        pedidos_pagados: pedidosPagados.length,
        total_recaudado: `$${totalRecaudado.toLocaleString("es-AR")}`,
        ticket_promedio: `$${ticketPromedio.toLocaleString("es-AR")}`,
      }
    }

    default:
      return { error: "Tool desconocida" }
  }
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

  let messages: Array<{ role: string; content: string }>

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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages = [...messages] as Anthropic.MessageParam[]

        // Agentic loop para manejar tool use
        while (true) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
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

          // Respuesta final: streamear texto en chunks
          for (const block of response.content) {
            if (block.type === "text") {
              const text = block.text
              const chunkSize = 8
              for (let i = 0; i < text.length; i += chunkSize) {
                controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)))
              }
            }
          }
          break
        }
      } catch (err) {
        console.error("[admin/chat] Error:", err)
        controller.enqueue(
          encoder.encode("Error al procesar la consulta. Intentá de nuevo.")
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  })
}

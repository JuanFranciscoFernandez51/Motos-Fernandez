import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runJob } from "@/lib/job-log"
import { OUTREACH_CONFIG, OUTREACH_TEMPLATES, BUSINESS } from "@/lib/constants"
import { sendEmail } from "@/lib/email"
import { actualizarEstadosVencidos } from "@/lib/financiacion-helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * Cron diario (9am AR) que mantiene al dia las cuotas:
 *   1. Marca cuotas con vencimiento pasado como ATRASADA y financiaciones
 *      con al menos 1 cuota atrasada como ATRASADA tambien.
 *   2. Detecta cuotas PENDIENTE con vencimiento en ~3 dias → crea tarea
 *      CUOTA_PROXIMA en /admin/outreach.
 *   3. Detecta cuotas que ya estan ATRASADA y todavia no tienen tarea
 *      CUOTA_VENCIDA → crea tarea.
 *   4. Manda un email al admin con el resumen del dia (cuantas nuevas
 *      tareas y vista rapida de las atrasadas).
 *
 * Idempotente: no duplica tareas. Si una cuota ya tiene tarea CUOTA_PROXIMA
 * o CUOTA_VENCIDA activa, no se crea otra.
 *
 * Cuando una cuota se marca como PAGADA, las tareas pendientes asociadas
 * se descartan en el endpoint que registra el pago (no en este cron).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || ""
  const cronSecret = process.env.CRON_SECRET
  const backupToken = process.env.BACKUP_TOKEN
  const isAuthorized =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (backupToken && auth === `Bearer ${backupToken}`)
  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const wrapped = await runJob("cuotas-recordatorio", async () => {
      // 1) Estados: marca cuotas atrasadas + financiaciones atrasadas
      await actualizarEstadosVencidos(prisma)

      const ahora = new Date()
      const hoyInicio = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
      )

      // 2) Próximas: vencen en [hoy, hoy + dias). Tomamos ventana de
      // 1 dia para no duplicar (el cron corre 1 vez por dia).
      const diasAnticipo = OUTREACH_CONFIG.diasRecordatorioCuota
      const desdeProxima = new Date(hoyInicio)
      desdeProxima.setDate(desdeProxima.getDate() + diasAnticipo)
      const hastaProxima = new Date(desdeProxima)
      hastaProxima.setDate(hastaProxima.getDate() + 1)

      const cuotasProximas = await prisma.cuotaFinanciacion.findMany({
        where: {
          estado: "PENDIENTE",
          fechaVencimiento: { gte: desdeProxima, lt: hastaProxima },
          // Solo si todavia no tiene una tarea CUOTA_PROXIMA generada
          outreachTareas: { none: { tipo: "CUOTA_PROXIMA" } },
        },
        include: {
          financiacion: {
            include: {
              cliente: {
                select: { id: true, nombre: true, apellido: true, telefono: true },
              },
            },
          },
        },
      })

      // 3) Vencidas: cuotas ATRASADA sin tarea CUOTA_VENCIDA
      const cuotasVencidas = await prisma.cuotaFinanciacion.findMany({
        where: {
          estado: "ATRASADA",
          outreachTareas: { none: { tipo: "CUOTA_VENCIDA" } },
        },
        include: {
          financiacion: {
            include: {
              cliente: {
                select: { id: true, nombre: true, apellido: true, telefono: true },
              },
            },
          },
        },
      })

      const fmtMonto = (n: number, moneda: string) =>
        moneda === "USD"
          ? `USD ${n.toLocaleString("es-AR")}`
          : `$ ${n.toLocaleString("es-AR")}`

      // 4) Crear tareas
      const proximasCreadas: { cliente: string; moto: string; cuota: number }[] = []
      for (const c of cuotasProximas) {
        const cliente = c.financiacion.cliente
        const mensaje = OUTREACH_TEMPLATES.CUOTA_PROXIMA({
          nombre: cliente.nombre,
          moto: c.financiacion.descripcion || "tu moto",
          numeroCuota: c.numero,
          totalCuotas: c.financiacion.cantidadCuotas,
          monto: fmtMonto(c.monto, c.financiacion.moneda),
          fechaVencimiento: new Date(c.fechaVencimiento).toLocaleDateString(
            "es-AR"
          ),
        })
        await prisma.outreachTarea.create({
          data: {
            tipo: "CUOTA_PROXIMA",
            estado: "PROGRAMADA",
            clienteId: cliente.id,
            cuotaId: c.id,
            telefono: cliente.telefono || null,
            mensaje,
            fechaProgramada: ahora,
          },
        })
        proximasCreadas.push({
          cliente: `${cliente.apellido}, ${cliente.nombre}`,
          moto: c.financiacion.descripcion || "—",
          cuota: c.numero,
        })
      }

      const vencidasCreadas: { cliente: string; moto: string; cuota: number; diasAtraso: number }[] = []
      for (const c of cuotasVencidas) {
        const cliente = c.financiacion.cliente
        const diasAtraso = Math.max(
          0,
          Math.floor(
            (hoyInicio.getTime() - new Date(c.fechaVencimiento).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
        const mensaje = OUTREACH_TEMPLATES.CUOTA_VENCIDA({
          nombre: cliente.nombre,
          moto: c.financiacion.descripcion || "tu moto",
          numeroCuota: c.numero,
          totalCuotas: c.financiacion.cantidadCuotas,
          monto: fmtMonto(c.monto, c.financiacion.moneda),
          diasAtraso,
        })
        await prisma.outreachTarea.create({
          data: {
            tipo: "CUOTA_VENCIDA",
            estado: "PROGRAMADA",
            clienteId: cliente.id,
            cuotaId: c.id,
            telefono: cliente.telefono || null,
            mensaje,
            fechaProgramada: ahora,
          },
        })
        vencidasCreadas.push({
          cliente: `${cliente.apellido}, ${cliente.nombre}`,
          moto: c.financiacion.descripcion || "—",
          cuota: c.numero,
          diasAtraso,
        })
      }

      // 5) Email al admin solo si hay novedades
      const totalNuevas = proximasCreadas.length + vencidasCreadas.length
      if (totalNuevas > 0) {
        const adminEmail = process.env.ADMIN_EMAIL || BUSINESS.email
        const adminBase =
          process.env.NEXT_PUBLIC_SITE_URL || "https://motosfernandez.com.ar"
        const seccionProximas =
          proximasCreadas.length > 0
            ? `
              <h3 style="color:#1D4ED8;margin:16px 0 6px">
                📅 ${proximasCreadas.length} cuota${proximasCreadas.length !== 1 ? "s" : ""} próxima${proximasCreadas.length !== 1 ? "s" : ""} a vencer
              </h3>
              <ul style="margin:0 0 10px;padding-left:18px">
                ${proximasCreadas
                  .map(
                    (c) =>
                      `<li>${c.cliente} — cuota ${c.cuota} de ${c.moto}</li>`
                  )
                  .join("")}
              </ul>
            `
            : ""
        const seccionVencidas =
          vencidasCreadas.length > 0
            ? `
              <h3 style="color:#B91C1C;margin:16px 0 6px">
                ⚠ ${vencidasCreadas.length} cuota${vencidasCreadas.length !== 1 ? "s" : ""} vencida${vencidasCreadas.length !== 1 ? "s" : ""}
              </h3>
              <ul style="margin:0 0 10px;padding-left:18px">
                ${vencidasCreadas
                  .map(
                    (c) =>
                      `<li>${c.cliente} — cuota ${c.cuota} de ${c.moto} (${c.diasAtraso} día${c.diasAtraso !== 1 ? "s" : ""} de atraso)</li>`
                  )
                  .join("")}
              </ul>
            `
            : ""
        const html = `
          <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:640px;margin:auto;padding:20px">
            <h2 style="color:#6B4F7A;margin:0 0 4px">Cuotas — recordatorio diario</h2>
            <p style="color:#666;margin:0 0 16px;font-size:13px">
              ${BUSINESS.name} — ${new Date().toLocaleDateString("es-AR", { dateStyle: "long" })}
            </p>
            <p style="font-size:14px">
              Se generaron <strong>${totalNuevas} tarea${totalNuevas !== 1 ? "s" : ""}</strong> de outreach.
              Despacha los WhatsApps desde
              <a href="${adminBase}/admin/outreach">/admin/outreach</a>.
            </p>
            ${seccionProximas}
            ${seccionVencidas}
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#888;font-size:11px">
              Este reporte se genera automaticamente cada dia a la mañana.
              Cada cuota dispara una sola tarea (no se repite).
            </p>
          </div>
        `
        await sendEmail({
          to: adminEmail,
          subject: `[${BUSINESS.name}] ${totalNuevas} cuota${totalNuevas !== 1 ? "s" : ""} para avisar`,
          html,
        })
      }

      return {
        proximas: proximasCreadas.length,
        vencidas: vencidasCreadas.length,
        total: totalNuevas,
        metadata: {
          proximas: proximasCreadas.length,
          vencidas: vencidasCreadas.length,
          total: totalNuevas,
        },
      }
    })

    return NextResponse.json({ ok: true, ...wrapped.result })
  } catch (e) {
    console.error("[cuotas-recordatorio] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

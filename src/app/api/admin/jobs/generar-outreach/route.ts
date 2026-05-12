import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runJob } from "@/lib/job-log"
import { OUTREACH_CONFIG, OUTREACH_TEMPLATES } from "@/lib/constants"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Cron diario que genera tareas de outreach para clientes que cumplen
 * los criterios:
 *  - NPS: pasaron `diasNPS` (10) días desde una OC CONCRETADA.
 *  - SERVICE_POSTVENTA: pasaron `diasServicePostVenta` (180) días desde
 *    una OC CONCRETADA.
 *
 * Para cada OC que cumple el criterio y no tiene ya una tarea del mismo
 * tipo, crea una OutreachTarea en estado PROGRAMADA. El admin las despacha
 * desde `/admin/outreach` con un click en "Abrir WhatsApp".
 *
 * Es idempotente: corre todos los días, las que ya existen no se duplican.
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
    const wrapped = await runJob("generar-outreach", async () => {
      const now = new Date()
      const diasA = (n: number) => {
        const d = new Date(now)
        d.setDate(d.getDate() - n)
        return d
      }

      // 1) NPS: OC concretadas hace exactamente `diasNPS` días o más,
      //    pero menos de un margen razonable (no queremos generar NPS de
      //    OCs viejas que nunca llegaron a generar tarea). Usamos ventana
      //    de [diasNPS, diasNPS + 30] para que el cron tenga margen si
      //    fallo algún día.
      const ventanaNpsDesde = diasA(OUTREACH_CONFIG.diasNPS + 30)
      const ventanaNpsHasta = diasA(OUTREACH_CONFIG.diasNPS)

      const ocsParaNps = await prisma.ordenCompra.findMany({
        where: {
          estado: "CONCRETADA",
          fecha: { gte: ventanaNpsDesde, lte: ventanaNpsHasta },
          // No tenga ya una tarea NPS asociada
          outreachTareas: { none: { tipo: "NPS" } },
        },
        include: {
          cliente: {
            select: { id: true, nombre: true, apellido: true, telefono: true },
          },
        },
      })

      // 2) SERVICE_POSTVENTA: igual con ventana [diasService, diasService + 60]
      //    Mas margen porque es mas tarde y no queremos perder ninguno.
      const ventanaSvcDesde = diasA(OUTREACH_CONFIG.diasServicePostVenta + 60)
      const ventanaSvcHasta = diasA(OUTREACH_CONFIG.diasServicePostVenta)

      const ocsParaService = await prisma.ordenCompra.findMany({
        where: {
          estado: "CONCRETADA",
          fecha: { gte: ventanaSvcDesde, lte: ventanaSvcHasta },
          outreachTareas: { none: { tipo: "SERVICE_POSTVENTA" } },
        },
        include: {
          cliente: {
            select: { id: true, nombre: true, apellido: true, telefono: true },
          },
        },
      })

      // 3) Crear las tareas. Si el cliente no tiene teléfono, igual creamos
      //    la tarea (el admin la descarta o llena el teléfono después).
      const tareasNuevas: { tipo: "NPS" | "SERVICE_POSTVENTA"; ocNumero: number }[] = []

      for (const oc of ocsParaNps) {
        const mensaje = OUTREACH_TEMPLATES.NPS({
          nombre: oc.cliente.nombre,
          moto: oc.motoDescripcion,
        })
        await prisma.outreachTarea.create({
          data: {
            tipo: "NPS",
            estado: "PROGRAMADA",
            clienteId: oc.cliente.id,
            ordenCompraId: oc.id,
            telefono: oc.cliente.telefono || null,
            mensaje,
            fechaProgramada: now,
          },
        })
        tareasNuevas.push({ tipo: "NPS", ocNumero: oc.numero })
      }

      for (const oc of ocsParaService) {
        const mensaje = OUTREACH_TEMPLATES.SERVICE_POSTVENTA({
          nombre: oc.cliente.nombre,
          moto: oc.motoDescripcion,
        })
        await prisma.outreachTarea.create({
          data: {
            tipo: "SERVICE_POSTVENTA",
            estado: "PROGRAMADA",
            clienteId: oc.cliente.id,
            ordenCompraId: oc.id,
            telefono: oc.cliente.telefono || null,
            mensaje,
            fechaProgramada: now,
          },
        })
        tareasNuevas.push({ tipo: "SERVICE_POSTVENTA", ocNumero: oc.numero })
      }

      return {
        nps: ocsParaNps.length,
        service: ocsParaService.length,
        total: tareasNuevas.length,
        metadata: {
          nps: ocsParaNps.length,
          service: ocsParaService.length,
          total: tareasNuevas.length,
        },
      }
    })

    return NextResponse.json({ ok: true, ...wrapped.result })
  } catch (e) {
    console.error("[generar-outreach] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

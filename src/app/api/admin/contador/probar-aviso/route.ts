import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { sendEmail } from "@/lib/email"
import { labelTipo } from "@/lib/contador-helpers"

/**
 * POST /api/admin/contador/probar-aviso
 * Envía un mail de PRUEBA con los próximos vencimientos (no marca nada, no
 * interfiere con el cron real). Sirve para verificar que el aviso llega.
 */
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const limite = new Date()
    limite.setDate(limite.getDate() + 20)
    const vencs = await prisma.vencimiento.findMany({
      where: { estado: "PENDIENTE", fechaVencimiento: { lte: limite } },
      orderBy: { fechaVencimiento: "asc" },
    })

    const fmtFecha = (d: Date) =>
      new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })
    const fmtMonto = (n: number | null) => (n != null ? `$ ${n.toLocaleString("es-AR")}` : "—")

    const filas =
      vencs.length > 0
        ? vencs
            .map(
              (v) =>
                `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>${labelTipo(v.tipo)}</strong> · ${v.periodo}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${fmtFecha(v.fechaVencimiento)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${fmtMonto(v.monto)}</td></tr>`
            )
            .join("")
        : `<tr><td colspan="3" style="padding:12px;color:#888">No hay vencimientos próximos cargados.</td></tr>`

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#3D2649">🧪 Prueba — Avisos de vencimientos</h2>
        <p style="color:#555">Este es un <strong>mail de prueba</strong> del Contador. Así te van a llegar los avisos automáticos (7/3/1 día antes y el día del vencimiento).</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="background:#f5f5f5"><th style="padding:8px 12px;text-align:left">Obligación</th><th style="padding:8px 12px;text-align:left">Vence</th><th style="padding:8px 12px;text-align:right">Monto</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <p style="margin-top:20px"><a href="https://www.motosfernandez.com.ar/admin/contador" style="background:#7C3AED;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Abrir el Contador</a></p>
      </div>`

    const destino = process.env.CONTADOR_AVISO_EMAIL || "administracion@vespabahia.com"
    await sendEmail({ to: destino, subject: "🧪 Prueba de aviso — Contador Motos Fernández", html })

    return NextResponse.json({ ok: true, destino, vencimientos: vencs.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

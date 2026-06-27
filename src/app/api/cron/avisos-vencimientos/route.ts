import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { asegurarVencimientos, labelTipo } from "@/lib/contador-helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/cron/avisos-vencimientos  (cron diario)
 *
 * Avisa por email los vencimientos fiscales que cruzan un umbral: 7, 3, 1 día,
 * el día (0) y "vencido". Marca cada aviso para no repetir. Un email resumen
 * por corrida (a lo sumo uno por día).
 */
const UMBRALES = [7, 3, 1, 0]

function diasHasta(d: Date): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(d)
  f.setHours(0, 0, 0, 0)
  return Math.round((f.getTime() - hoy.getTime()) / 86400000)
}

/** Bucket de aviso para X días restantes. null si todavía falta mucho (>7). */
function bucket(dias: number): string | null {
  if (dias < 0) return "venc"
  const t = UMBRALES.filter((u) => dias <= u).sort((a, b) => a - b)[0]
  return t === undefined ? null : String(t)
}

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })
const fmtMonto = (n: number | null) => (n != null ? `$ ${n.toLocaleString("es-AR")}` : "—")

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || ""
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    await asegurarVencimientos(3)

    const limite = new Date()
    limite.setDate(limite.getDate() + 8)
    const pendientes = await prisma.vencimiento.findMany({
      where: { estado: "PENDIENTE", fechaVencimiento: { lte: limite } },
      orderBy: { fechaVencimiento: "asc" },
    })

    const aAvisar: { v: (typeof pendientes)[number]; dias: number; key: string }[] = []
    for (const v of pendientes) {
      const dias = diasHasta(v.fechaVencimiento)
      const key = bucket(dias)
      if (key && !v.avisosEnviados.includes(key)) {
        aAvisar.push({ v, dias, key })
      }
    }

    if (aAvisar.length === 0) {
      return NextResponse.json({ ok: true, avisados: 0 })
    }

    // Email resumen
    const filas = aAvisar
      .map(({ v, dias }) => {
        const cuando =
          dias < 0
            ? `<span style="color:#dc2626;font-weight:700">VENCIDO hace ${Math.abs(dias)} día(s)</span>`
            : dias === 0
              ? `<span style="color:#d97706;font-weight:700">vence HOY</span>`
              : `vence en <strong>${dias} día${dias === 1 ? "" : "s"}</strong>`
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>${labelTipo(v.tipo)}</strong><br><span style="color:#888;font-size:12px">${v.titulo} · ${v.periodo}</span></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${fmtFecha(v.fechaVencimiento)}<br><span style="font-size:12px">${cuando}</span></td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${fmtMonto(v.monto)}</td>
        </tr>`
      })
      .join("")

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#3D2649">⏰ Vencimientos fiscales próximos</h2>
        <p style="color:#555">Tenés ${aAvisar.length} vencimiento(s) por atender:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left">Obligación</th>
            <th style="padding:8px 12px;text-align:left">Vencimiento</th>
            <th style="padding:8px 12px;text-align:right">Monto est.</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <p style="margin-top:20px"><a href="https://www.motosfernandez.com.ar/admin/contador" style="background:#7C3AED;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Ver en el panel</a></p>
        <p style="color:#999;font-size:12px;margin-top:16px">Motos Fernández — recordatorio automático. Marcá cada uno como pagado en el panel.</p>
      </div>`

    const destino = process.env.CONTADOR_AVISO_EMAIL || "administracion@vespabahia.com"
    await sendEmail({
      to: destino,
      subject: `⏰ ${aAvisar.length} vencimiento(s) fiscal(es) próximo(s)`,
      html,
    })

    // Marcar los avisos enviados
    await Promise.all(
      aAvisar.map(({ v, key }) =>
        prisma.vencimiento.update({
          where: { id: v.id },
          data: { avisosEnviados: { set: [...v.avisosEnviados, key] } },
        })
      )
    )

    return NextResponse.json({ ok: true, avisados: aAvisar.length, destino })
  } catch (e) {
    console.error("[cron/avisos-vencimientos] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

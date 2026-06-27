import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runJob } from "@/lib/job-log"
import { sendEmail } from "@/lib/email"
import { BUSINESS } from "@/lib/constants"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * Verificador de stock vs publicaciones. Cron semanal (lunes 9am AR).
 *
 * Busca inconsistencias entre el catálogo interno y las publicaciones
 * externas (Mercado Libre, Instagram, Facebook) y manda un email al
 * admin con la lista de cosas que requieren atención:
 *
 *  - Motos vendidas que siguen ACTIVAS en ML.
 *  - Motos vendidas con post de IG/FB todavía vinculado (no se pueden
 *    despublicar automaticamente — solo se reporta para que el admin
 *    decida si borrarlas o no).
 *  - Motos activas en el catálogo pero sin foto cargada (no salen en
 *    el catálogo público y son ventas perdidas).
 *  - Motos con etiqueta "ULTIMA_UNIDAD" o "RESERVADA" mal puestas
 *    (vendidas hace tiempo).
 *
 * El email se manda solo si hay al menos una inconsistencia.
 * El resultado se guarda en JobLog con los IDs procesados para
 * trazabilidad.
 *
 * Disparadores:
 *  - Cron de Vercel (header `authorization: Bearer ${CRON_SECRET}`).
 *  - Manual desde el panel admin con `authorization: Bearer ${BACKUP_TOKEN}`.
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
    const wrapped = await runJob("verificar-publicaciones", async () => {
      // 1) Vendidas activas en ML
      const vendidasActivasML = await prisma.modelo.findMany({
        where: {
          vendida: true,
          mlListingId: { not: null },
          mlEstado: "active",
        },
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          mlListingId: true,
          mlPermalink: true,
          fechaVenta: true,
        },
      })

      // 2) Vendidas con IG/FB todavia vinculado
      const vendidasEnRRSS = await prisma.modelo.findMany({
        where: {
          vendida: true,
          OR: [
            { igPostId: { not: null } },
            { fbPostId: { not: null } },
          ],
        },
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          igPermalink: true,
          fbPermalink: true,
          fechaVenta: true,
        },
      })

      // 3) Activas en catalogo sin fotos (venta perdida)
      const activasSinFoto = await prisma.modelo.findMany({
        where: {
          activo: true,
          vendida: false,
          OR: [{ fotos: { isEmpty: true } }, { fotos: { equals: [] } }],
        },
        select: { id: true, slug: true, marca: true, nombre: true },
      })

      // 4) Vendidas con etiqueta que sugiere disponibilidad (mal estado)
      const vendidasConEtiqueta = await prisma.modelo.findMany({
        where: {
          vendida: true,
          etiqueta: {
            in: ["DISPONIBLE", "ULTIMA_UNIDAD", "RECIEN_INGRESADA", "RESERVADA"],
          },
        },
        select: {
          id: true,
          slug: true,
          marca: true,
          nombre: true,
          etiqueta: true,
        },
      })

      const total =
        vendidasActivasML.length +
        vendidasEnRRSS.length +
        activasSinFoto.length +
        vendidasConEtiqueta.length

      // Si todo OK, no mandamos email — solo log de exito.
      if (total === 0) {
        return {
          inconsistencias: 0,
          message: "Sin inconsistencias detectadas",
          metadata: {
            mlVendidasActivas: 0,
            rrssVendidasPublicadas: 0,
            activasSinFoto: 0,
            vendidasConEtiqueta: 0,
          },
        }
      }

      // Armar HTML del email
      const adminBase = process.env.NEXT_PUBLIC_SITE_URL || "https://motosfernandez.com.ar"
      const linkML = (slug: string) =>
        `<a href="${adminBase}/admin/modelos">${slug}</a>`

      const htmlSecciones: string[] = []

      if (vendidasActivasML.length > 0) {
        htmlSecciones.push(`
          <h3 style="color:#B91C1C;margin:16px 0 6px">
            🛒 ${vendidasActivasML.length} motos vendidas siguen ACTIVAS en Mercado Libre
          </h3>
          <p style="margin:0 0 6px;color:#444;font-size:13px">
            Estas motos ya las vendiste pero la publicación de ML sigue activa.
            Pausalas desde el panel para no recibir consultas vacías.
          </p>
          <ul style="margin:0 0 10px;padding-left:18px">
            ${vendidasActivasML
              .map(
                (m) =>
                  `<li>${linkML(m.slug)} — ${m.marca} ${m.nombre}` +
                  (m.fechaVenta
                    ? ` <span style="color:#888;font-size:11px">(vendida ${new Date(m.fechaVenta).toLocaleDateString("es-AR")})</span>`
                    : "") +
                  (m.mlPermalink
                    ? ` · <a href="${m.mlPermalink}" target="_blank">ver en ML</a>`
                    : "") +
                  `</li>`
              )
              .join("")}
          </ul>
        `)
      }

      if (vendidasEnRRSS.length > 0) {
        htmlSecciones.push(`
          <h3 style="color:#B45309;margin:16px 0 6px">
            📱 ${vendidasEnRRSS.length} motos vendidas con posts vivos en IG/FB
          </h3>
          <p style="margin:0 0 6px;color:#444;font-size:13px">
            Considerá borrar los posts de redes para evitar consultas, o publicar
            un comentario "VENDIDA".
          </p>
          <ul style="margin:0 0 10px;padding-left:18px">
            ${vendidasEnRRSS
              .map(
                (m) =>
                  `<li>${linkML(m.slug)} — ${m.marca} ${m.nombre}` +
                  (m.igPermalink
                    ? ` · <a href="${m.igPermalink}" target="_blank">IG</a>`
                    : "") +
                  (m.fbPermalink
                    ? ` · <a href="${m.fbPermalink}" target="_blank">FB</a>`
                    : "") +
                  `</li>`
              )
              .join("")}
          </ul>
        `)
      }

      if (activasSinFoto.length > 0) {
        htmlSecciones.push(`
          <h3 style="color:#1D4ED8;margin:16px 0 6px">
            📷 ${activasSinFoto.length} motos activas sin foto
          </h3>
          <p style="margin:0 0 6px;color:#444;font-size:13px">
            Sin foto no aparecen bien en el catálogo público. Cargá una foto
            para que estén listas para vender.
          </p>
          <ul style="margin:0 0 10px;padding-left:18px">
            ${activasSinFoto
              .map((m) => `<li>${linkML(m.slug)} — ${m.marca} ${m.nombre}</li>`)
              .join("")}
          </ul>
        `)
      }

      if (vendidasConEtiqueta.length > 0) {
        htmlSecciones.push(`
          <h3 style="color:#7C3AED;margin:16px 0 6px">
            🏷 ${vendidasConEtiqueta.length} motos vendidas con etiqueta "disponible"
          </h3>
          <p style="margin:0 0 6px;color:#444;font-size:13px">
            Sacá la etiqueta así no queda inconsistente en el catálogo (ya no se
            ven publicadas, pero queda raro en reportes).
          </p>
          <ul style="margin:0 0 10px;padding-left:18px">
            ${vendidasConEtiqueta
              .map(
                (m) =>
                  `<li>${linkML(m.slug)} — ${m.marca} ${m.nombre} <span style="color:#888">(${m.etiqueta})</span></li>`
              )
              .join("")}
          </ul>
        `)
      }

      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:640px;margin:auto;padding:20px">
          <h2 style="color:#7C3AED;margin:0 0 4px">Verificador semanal de publicaciones</h2>
          <p style="color:#666;margin:0 0 16px;font-size:13px">
            ${BUSINESS.name} — ${new Date().toLocaleDateString("es-AR", { dateStyle: "long" })}
          </p>
          <p style="font-size:14px">
            Encontré <strong>${total} cosas</strong> que revisar:
          </p>
          ${htmlSecciones.join("")}
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
          <p style="color:#888;font-size:11px">
            Este reporte se genera automaticamente cada lunes a la mañana.
            Lo podés ejecutar manualmente desde <a href="${adminBase}/admin/sistema">/admin/sistema</a>.
          </p>
        </div>
      `

      const adminEmail = process.env.ADMIN_EMAIL || BUSINESS.email
      await sendEmail({
        to: adminEmail,
        subject: `[${BUSINESS.name}] ${total} cosas para revisar — verificador semanal`,
        html,
      })

      return {
        inconsistencias: total,
        message: `${total} inconsistencias detectadas`,
        breakdown: {
          mlVendidasActivas: vendidasActivasML.length,
          rrssVendidasPublicadas: vendidasEnRRSS.length,
          activasSinFoto: activasSinFoto.length,
          vendidasConEtiqueta: vendidasConEtiqueta.length,
        },
        metadata: {
          inconsistencias: total,
          mlVendidasActivas: vendidasActivasML.length,
          rrssVendidasPublicadas: vendidasEnRRSS.length,
          activasSinFoto: activasSinFoto.length,
          vendidasConEtiqueta: vendidasConEtiqueta.length,
        },
      }
    })

    return NextResponse.json({ ok: true, ...wrapped.result })
  } catch (e) {
    console.error("[verificar-publicaciones] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

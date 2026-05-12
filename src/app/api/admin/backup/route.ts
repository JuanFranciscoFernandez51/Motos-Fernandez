import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"
import { runJob } from "@/lib/job-log"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 min — la DB con miles de filas tarda

/**
 * Endpoint de backup: vuelca TODAS las tablas críticas a un JSON y lo sube
 * a Cloudinary en una carpeta privada (no listable públicamente).
 *
 * Disparadores:
 * 1. Cron de Vercel (header `authorization: Bearer ${CRON_SECRET}`).
 * 2. Manual con `Authorization: Bearer ${BACKUP_TOKEN}` desde curl.
 *
 * Restaurar: descargar el JSON desde Cloudinary y correr
 * `node scripts/restore-backup.mjs path/al/backup.json`.
 */
export async function GET(request: Request) {
  // Auth: aceptamos CRON_SECRET (que mete Vercel automáticamente) o BACKUP_TOKEN
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
    const wrapped = await runJob("backup-json", async () => {
    const startedAt = new Date()
    console.log("[backup] Iniciando dump...")

    // Vuelco completo de todas las tablas críticas en paralelo.
    // Si en el futuro agregás un modelo nuevo, sumalo acá.
    const [
      clientes,
      modelos,
      modeloColores,
      ordenesCompra,
      ocPermutas,
      mandatos,
      ordenesTrabajo,
      tiposServicio,
      financiaciones,
      cuotas,
      proveedores,
      noticias,
      testimonios,
      productos,
      cupones,
      turnos,
      leads,
      pedidos,
      configuracion,
    ] = await Promise.all([
      prisma.cliente.findMany(),
      prisma.modelo.findMany(),
      prisma.modeloColor.findMany(),
      prisma.ordenCompra.findMany(),
      prisma.oCPermuta.findMany(),
      prisma.mandatoVenta.findMany(),
      prisma.ordenTrabajo.findMany(),
      prisma.tipoServicio.findMany(),
      prisma.financiacionOC.findMany(),
      prisma.cuotaFinanciacion.findMany(),
      prisma.proveedor.findMany(),
      prisma.noticia.findMany(),
      prisma.testimonio.findMany(),
      prisma.producto.findMany().catch(() => []),
      prisma.cupon.findMany().catch(() => []),
      prisma.turno.findMany().catch(() => []),
      prisma.lead.findMany().catch(() => []),
      prisma.pedido.findMany().catch(() => []),
      prisma.configuracion.findMany().catch(() => []),
    ])

    const dump = {
      _meta: {
        version: 1,
        createdAt: startedAt.toISOString(),
        env: process.env.VERCEL_ENV || "local",
        counts: {
          clientes: clientes.length,
          modelos: modelos.length,
          modeloColores: modeloColores.length,
          ordenesCompra: ordenesCompra.length,
          ocPermutas: ocPermutas.length,
          mandatos: mandatos.length,
          ordenesTrabajo: ordenesTrabajo.length,
          tiposServicio: tiposServicio.length,
          financiaciones: financiaciones.length,
          cuotas: cuotas.length,
          proveedores: proveedores.length,
          noticias: noticias.length,
          testimonios: testimonios.length,
          productos: productos.length,
          cupones: cupones.length,
          turnos: turnos.length,
          leads: leads.length,
          pedidos: pedidos.length,
        },
      },
      clientes,
      modelos,
      modeloColores,
      ordenesCompra,
      ocPermutas,
      mandatos,
      ordenesTrabajo,
      tiposServicio,
      financiaciones,
      cuotas,
      proveedores,
      noticias,
      testimonios,
      productos,
      cupones,
      turnos,
      leads,
      pedidos,
      configuracion,
    }

    const json = JSON.stringify(dump)
    const sizeKB = Math.round(json.length / 1024)
    console.log(
      `[backup] Dump generado en ${Date.now() - startedAt.getTime()}ms — ${sizeKB} KB`
    )

    // Subir a Cloudinary como archivo "raw" (no es imagen)
    const fecha = startedAt.toISOString().split("T")[0] // 2026-05-13
    const filename = `backup-${fecha}-${startedAt.getTime()}`

    const upload = await new Promise<{ secure_url: string; public_id: string; bytes: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "motos-fernandez/backups",
            resource_type: "raw",
            public_id: filename,
            type: "private", // privado: no accesible públicamente sin firma
            format: "json",
          },
          (error, result) => {
            if (error || !result) reject(error)
            else
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
                bytes: result.bytes,
              })
          }
        )
        stream.end(Buffer.from(json, "utf8"))
      }
    )

    const elapsedMs = Date.now() - startedAt.getTime()
    console.log(`[backup] OK — ${upload.bytes} bytes en ${elapsedMs}ms`)

    return {
      startedAt,
      sizeKB,
      elapsedMs,
      counts: dump._meta.counts,
      cloudinary: {
        publicId: upload.public_id,
        url: upload.secure_url,
      },
      metadata: {
        sizeKB,
        bytes: upload.bytes,
        cloudinaryPublicId: upload.public_id,
        counts: dump._meta.counts,
      },
    }
    })  // cierra runJob
    return NextResponse.json({
      ok: true,
      createdAt: wrapped.result.startedAt.toISOString(),
      sizeKB: wrapped.result.sizeKB,
      elapsedMs: wrapped.result.elapsedMs,
      counts: wrapped.result.counts,
      cloudinary: wrapped.result.cloudinary,
    })
  } catch (e) {
    console.error("[backup] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en backup" },
      { status: 500 }
    )
  }
}

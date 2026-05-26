import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { publicarEnMeta } from "@/lib/meta/publication"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Vercel Pro: hasta 60s. Cada publicación a Meta tarda 5-20s, así que
// procesamos batches chicos para no timeoutear.
export const maxDuration = 60

/**
 * Cron de publicación de ScheduledPost. Se llama desde vercel.json cada
 * 5 minutos. Brief §4.3.
 *
 * Lógica:
 * 1. Auth: header "Authorization: Bearer ${CRON_SECRET}".
 * 2. Si FEATURE_SCHEDULED_POSTS_ENABLED != "true", no hace nada.
 * 3. Lockea posts PENDING con scheduledAt <= ahora.
 * 4. Para cada uno, llama publicarEnMeta con sus platforms + caption.
 * 5. Actualiza status (PUBLISHED / PARTIAL / FAILED).
 * 6. Reporta counts en el response.
 *
 * Idempotencia: optimistic locking con lockedAt + lockedBy. Si un worker
 * queda colgado, lockedAt < ahora-10min se considera zombi y otro cron lo
 * recupera.
 */

const LOCK_TIMEOUT_MIN = 10
const BATCH_SIZE = 5 // máx posts por ejecución del cron (5 × ~15s = 75s)
const MAX_RETRIES = 3

export async function GET(request: Request) {
  // 1) Auth
  const auth = request.headers.get("authorization") || ""
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2) Feature flag
  if (process.env.FEATURE_SCHEDULED_POSTS_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "FEATURE_SCHEDULED_POSTS_ENABLED no está en 'true'",
    })
  }

  const workerId = randomUUID()
  const ahora = new Date()
  const lockCutoff = new Date(ahora.getTime() - LOCK_TIMEOUT_MIN * 60 * 1000)

  // 3) Levantar candidatos. Filtramos PENDING + scheduledAt vencido +
  //    sin lock vigente.
  const candidatos = await prisma.scheduledPost.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: ahora },
      OR: [{ lockedAt: null }, { lockedAt: { lt: lockCutoff } }],
    },
    orderBy: { scheduledAt: "asc" },
    take: BATCH_SIZE,
    select: {
      id: true,
      motoId: true,
      platforms: true,
      customCaption: true,
      retryCount: true,
      lockedAt: true,
    },
  })

  const result = {
    workerId,
    processed: 0,
    published: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    details: [] as Array<Record<string, unknown>>,
  }

  for (const cand of candidatos) {
    // 4) Optimistic lock: actualizar SOLO si lockedAt sigue siendo el
    //    valor que vimos antes. updateMany devuelve count.
    const locked = await prisma.scheduledPost.updateMany({
      where: {
        id: cand.id,
        // El where adicional asegura que nadie más lo tomó entre el
        // findMany y este update.
        OR: [
          { lockedAt: null },
          { lockedAt: { lt: lockCutoff } },
        ],
      },
      data: {
        lockedAt: ahora,
        lockedBy: workerId,
        status: "PROCESSING",
        lastAttemptAt: ahora,
      },
    })
    if (locked.count === 0) {
      result.skipped++
      result.details.push({ id: cand.id, action: "skipped_lock_race" })
      continue
    }
    result.processed++

    // 5) Verificar que la moto sigue siendo publicable
    const moto = await prisma.modelo.findUnique({
      where: { id: cand.motoId },
      select: {
        id: true,
        activeForMarketing: true,
        vendida: true,
        fotos: true,
      },
    })
    if (!moto || moto.vendida || !moto.activeForMarketing) {
      await prisma.scheduledPost.update({
        where: { id: cand.id },
        data: {
          status: "CANCELLED",
          errorMessage: !moto
            ? "Moto eliminada"
            : moto.vendida
              ? "Moto vendida"
              : "Moto marcada como inactiva para marketing",
          lockedAt: null,
          lockedBy: null,
        },
      })
      result.cancelled++
      result.details.push({ id: cand.id, action: "cancelled_moto_state" })
      continue
    }

    // 6) Publicar
    const platforms = (cand.platforms as ("IG" | "FB")[]).filter(
      (p) => p === "IG" || p === "FB"
    )
    let publishResult: Awaited<ReturnType<typeof publicarEnMeta>>
    try {
      publishResult = await publicarEnMeta(cand.motoId, {
        platforms,
        customCaption: cand.customCaption || undefined,
        // forceRepublish=true porque un mismo modelo puede tener varios
        // scheduled posts y no queremos que el segundo falle con "ya
        // publicada". Cada ejecución es un post nuevo.
        forceRepublish: true,
      })
    } catch (e) {
      publishResult = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }
    }

    // 7) Interpretar resultado y mover status
    const igOk = !!publishResult.igPostId
    const fbOk = !!publishResult.fbPostId
    const igPedida = platforms.includes("IG")
    const fbPedida = platforms.includes("FB")
    const igPendiente = igPedida && !igOk
    const fbPendiente = fbPedida && !fbOk

    let nuevoStatus: string
    if (!igPendiente && !fbPendiente) {
      nuevoStatus = "PUBLISHED"
      result.published++
    } else if (igOk || fbOk) {
      nuevoStatus = "PARTIAL"
      result.partial++
    } else {
      // Ambas (o única solicitada) fallaron
      const reintentos = cand.retryCount + 1
      nuevoStatus = reintentos >= MAX_RETRIES ? "FAILED" : "PENDING"
      result.failed++
    }

    const publishedRefs: Record<string, unknown> = {}
    if (publishResult.igPostId) {
      publishedRefs.ig = {
        postId: publishResult.igPostId,
        permalink: publishResult.igPermalink,
        publishedAt: ahora.toISOString(),
      }
    }
    if (publishResult.fbPostId) {
      publishedRefs.fb = {
        postId: publishResult.fbPostId,
        permalink: publishResult.fbPermalink,
        publishedAt: ahora.toISOString(),
      }
    }

    await prisma.scheduledPost.update({
      where: { id: cand.id },
      data: {
        status: nuevoStatus,
        publishedAt: nuevoStatus === "PUBLISHED" ? ahora : null,
        publishedRefs: Object.keys(publishedRefs).length
          ? (publishedRefs as Prisma.InputJsonValue)
          : undefined,
        errorMessage: publishResult.error || null,
        retryCount: nuevoStatus === "PENDING" ? cand.retryCount + 1 : cand.retryCount,
        // Liberar el lock para que un próximo cron pueda re-procesar si quedó PENDING
        lockedAt: nuevoStatus === "PENDING" ? null : ahora,
        lockedBy: nuevoStatus === "PENDING" ? null : workerId,
      },
    })

    result.details.push({
      id: cand.id,
      motoId: cand.motoId,
      status: nuevoStatus,
      igOk,
      fbOk,
      error: publishResult.error,
    })
  }

  return NextResponse.json({ ok: true, ...result })
}

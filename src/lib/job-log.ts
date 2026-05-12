import { prisma } from "@/lib/prisma"

/**
 * Wrapper para correr un job y dejar trazas en la tabla JobLog.
 *
 * Uso típico desde un endpoint de cron:
 *
 *   const result = await runJob("backup-sheets", async () => {
 *     // ... lógica del job ...
 *     return { metadata: { filas: 123 } }
 *   })
 *
 * Si el callback tira, se loggea `ok: false` con el mensaje del error
 * y se vuelve a lanzar la excepción para que el caller le devuelva 500.
 */
export async function runJob<T extends { metadata?: unknown } | void>(
  job: string,
  fn: () => Promise<T>
): Promise<{ ok: true; result: T; durationMs: number } | never> {
  const startedAt = Date.now()
  try {
    const result = await fn()
    const durationMs = Date.now() - startedAt
    const metadata =
      result && typeof result === "object" && "metadata" in result
        ? (result as { metadata?: unknown }).metadata
        : null
    await prisma.jobLog
      .create({
        data: {
          job,
          ok: true,
          message: null,
          durationMs,
          metadata: (metadata as object | null) ?? undefined,
        },
      })
      .catch((e) => {
        // No interrumpir el job si falla el log
        console.error(`[job-log] No se pudo loggear ${job} ok:`, e)
      })
    return { ok: true, result, durationMs }
  } catch (e) {
    const durationMs = Date.now() - startedAt
    const message = e instanceof Error ? e.message : String(e)
    await prisma.jobLog
      .create({
        data: { job, ok: false, message, durationMs },
      })
      .catch((logErr) => {
        console.error(`[job-log] No se pudo loggear ${job} error:`, logErr)
      })
    throw e
  }
}

/**
 * Trae los últimos N logs para mostrarlos en el panel admin.
 */
export async function lastLogsForJob(job: string, limit = 10) {
  return prisma.jobLog.findMany({
    where: { job },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

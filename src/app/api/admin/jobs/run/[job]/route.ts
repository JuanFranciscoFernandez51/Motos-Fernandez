import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const JOBS: Record<string, string> = {
  "backup-json": "/api/admin/backup",
  "backup-sheets": "/api/admin/backup-sheets",
  "verificar-publicaciones": "/api/admin/jobs/verificar-publicaciones",
  "generar-outreach": "/api/admin/jobs/generar-outreach",
}

/**
 * POST /api/admin/jobs/run/[job]
 * Permite al admin ejecutar manualmente un cron desde el panel.
 * Internamente hace fetch al endpoint del cron con el header de auth
 * (Bearer BACKUP_TOKEN) para reusar la lógica existente.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ job: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { job } = await params
  const path = JOBS[job]
  if (!path) {
    return NextResponse.json(
      { error: `Job desconocido: ${job}` },
      { status: 400 }
    )
  }

  const backupToken = process.env.BACKUP_TOKEN
  if (!backupToken) {
    return NextResponse.json(
      {
        error:
          "Falta BACKUP_TOKEN en las env vars. Agregalo en Vercel para poder ejecutar jobs manualmente.",
      },
      { status: 500 }
    )
  }

  // Reuse the request's origin so funciona tanto en local como en Vercel
  const url = new URL(request.url)
  const target = `${url.origin}${path}`
  try {
    const res = await fetch(target, {
      method: "GET",
      headers: { authorization: `Bearer ${backupToken}` },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

import { prisma } from "@/lib/prisma"
import { SistemaClient, type JobInfo } from "./sistema-client"

export const dynamic = "force-dynamic"

const JOBS: JobInfo[] = [
  {
    key: "backup-json",
    titulo: "Backup completo a Cloudinary (JSON)",
    descripcion:
      "Vuelca todas las tablas a un JSON privado en Cloudinary. Permite restaurar si se rompe la base. Se programa los lunes a las 3am AR.",
    cron: "0 6 * * 1",
    cronDescripcion: "Lunes 3am AR",
    envVars: ["RESEND_API_KEY (opcional)", "CRON_SECRET / BACKUP_TOKEN"],
  },
  {
    key: "backup-sheets",
    titulo: "Backup a Google Sheets",
    descripcion:
      "Dump diario de las tablas operativas a un Google Sheet (Clientes, Motos, OC, Permutas, Mandatos, Taller, Financiaciones, Cuotas, Proveedores). Sirve como vista rápida y respaldo legible.",
    cron: "0 7 * * *",
    cronDescripcion: "Todos los días 4am AR",
    envVars: [
      "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      "GOOGLE_PRIVATE_KEY",
      "GOOGLE_SHEET_ID",
      "CRON_SECRET / BACKUP_TOKEN",
    ],
  },
  {
    key: "verificar-publicaciones",
    titulo: "Verificador de stock vs publicaciones",
    descripcion:
      "Detecta motos vendidas que siguen publicadas en ML/IG/FB, motos activas sin foto, etiquetas mal puestas. Si encuentra algo te manda un mail con el detalle.",
    cron: "0 12 * * 1",
    cronDescripcion: "Lunes 9am AR",
    envVars: ["RESEND_API_KEY", "ADMIN_EMAIL", "CRON_SECRET / BACKUP_TOKEN"],
  },
  {
    key: "generar-outreach",
    titulo: "Generar tareas de outreach (service + NPS)",
    descripcion:
      "Revisa OCs concretadas y genera tareas en la cola de outreach: NPS a los 10 días, service post-venta a los 6 meses. Vos las despachás desde /admin/outreach.",
    cron: "30 12 * * *",
    cronDescripcion: "Todos los días 9:30am AR",
    envVars: ["CRON_SECRET / BACKUP_TOKEN"],
  },
  {
    key: "cuotas-recordatorio",
    titulo: "Recordatorios de cuotas (financiación)",
    descripcion:
      "Mantiene al día el estado de las cuotas (atrasadas), genera tareas de outreach 3 días antes del vencimiento y para las que pasan a vencidas. Manda un email al admin con el resumen.",
    cron: "0 12 * * *",
    cronDescripcion: "Todos los días 9am AR",
    envVars: ["RESEND_API_KEY", "ADMIN_EMAIL", "CRON_SECRET / BACKUP_TOKEN"],
  },
]

export default async function SistemaPage() {
  // Para cada job, trae los últimos 5 logs
  const jobsConLogs = await Promise.all(
    JOBS.map(async (j) => {
      const logs = await prisma.jobLog.findMany({
        where: { job: j.key },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      return {
        ...j,
        logs: logs.map((l) => ({
          id: l.id,
          ok: l.ok,
          message: l.message,
          durationMs: l.durationMs,
          metadata: l.metadata as Record<string, unknown> | null,
          createdAt: l.createdAt.toISOString(),
        })),
      }
    })
  )

  // Diagnóstico de env vars críticas (sin exponer valores)
  const envCheck = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    BACKUP_TOKEN: !!process.env.BACKUP_TOKEN,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    ADMIN_EMAIL: !!process.env.ADMIN_EMAIL,
  }
  const sheetUrl = process.env.GOOGLE_SHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`
    : null

  return (
    <SistemaClient jobs={jobsConLogs} envCheck={envCheck} sheetUrl={sheetUrl} />
  )
}

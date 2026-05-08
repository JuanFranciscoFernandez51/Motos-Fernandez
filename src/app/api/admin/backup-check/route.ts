import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * Endpoint de diagnostico (TEMPORAL — borrar despues de debuggear).
 * Sin auth porque no revela secrets, solo dice si las env vars estan
 * presentes y de que largo son. Util para chequear que el env de Vercel
 * tiene lo que esperamos.
 */
export async function GET() {
  const tok = process.env.BACKUP_TOKEN
  const cronSecret = process.env.CRON_SECRET
  const sheetId = process.env.GOOGLE_SHEET_ID
  const googleEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const googleKey = process.env.GOOGLE_PRIVATE_KEY

  return NextResponse.json({
    deployTime: new Date().toISOString(),
    backupToken: {
      set: !!tok,
      length: tok?.length || 0,
      // Primeros 4 + ultimos 4 con asteriscos en el medio (debug seguro)
      preview: tok ? `${tok.slice(0, 4)}...${tok.slice(-4)}` : null,
    },
    cronSecret: {
      set: !!cronSecret,
      length: cronSecret?.length || 0,
    },
    google: {
      sheetId: { set: !!sheetId, length: sheetId?.length || 0 },
      email: { set: !!googleEmail, value: googleEmail || null },
      privateKey: {
        set: !!googleKey,
        length: googleKey?.length || 0,
        startsWithBegin: googleKey?.startsWith("-----BEGIN") || false,
        hasEscapedNewlines: googleKey?.includes("\\n") || false,
        hasRealNewlines: googleKey?.includes("\n") || false,
      },
    },
  })
}

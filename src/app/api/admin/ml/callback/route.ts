import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeCodeForToken, mlGet } from "@/lib/ml/client"

export const dynamic = "force-dynamic"

/**
 * Callback de OAuth: recibe ?code=XXX (o ?error=XXX si rechazó).
 * Intercambia el code por access+refresh token y los guarda en MLConfig.
 * Después trae info del usuario y lo guarda también.
 *
 * IMPORTANTE: este endpoint NO requiere admin auth porque es invocado por
 * el browser del user (la cookie de NextAuth podria no propagarse en el
 * redirect cross-domain). Pero el flujo solo arranca via /admin/ml/connect
 * que SI requiere admin. Igual el code es one-shot y solo válido para
 * nuestra app, así que no hay riesgo de que alguien externo abuse.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const errorMl = url.searchParams.get("error")
  const baseRedirect = "/admin/ml"

  if (errorMl) {
    return NextResponse.redirect(
      new URL(`${baseRedirect}?error=${encodeURIComponent(errorMl)}`, request.url)
    )
  }
  if (!code) {
    return NextResponse.redirect(
      new URL(`${baseRedirect}?error=sin_code`, request.url)
    )
  }

  try {
    // 1) Intercambiar code → tokens
    const tokens = await exchangeCodeForToken(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // 2) Guardar tokens (upsert para que la primera vez también funcione)
    await prisma.mLConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        userId: String(tokens.user_id),
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope || null,
        siteId: "MLA",
      },
      update: {
        userId: String(tokens.user_id),
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope || null,
      },
    })

    // 3) Traer info del user de ML (nickname, email)
    try {
      const me = await mlGet<{ id: number; nickname: string; email?: string }>(
        "/users/me"
      )
      await prisma.mLConfig.update({
        where: { id: "default" },
        data: { nickname: me.nickname, email: me.email },
      })
    } catch (e) {
      console.warn("[ML callback] No se pudo traer /users/me:", e)
    }

    return NextResponse.redirect(
      new URL(`${baseRedirect}?ok=1`, request.url)
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en callback"
    console.error("[ML callback]", e)
    return NextResponse.redirect(
      new URL(`${baseRedirect}?error=${encodeURIComponent(msg)}`, request.url)
    )
  }
}

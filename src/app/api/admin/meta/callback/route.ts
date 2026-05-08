import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  exchangeCodeForToken,
  getLongLivedUserToken,
  getPages,
  getUserInfo,
  getIGAccountForPage,
} from "@/lib/meta/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Callback del OAuth de Meta. Recibe ?code=, lo intercambia por tokens,
 * detecta page de FB y cuenta IG asociada, y guarda todo en MetaConfig.
 *
 * BYPASS de auth: este endpoint debe estar excluido del middleware de
 * admin (lo agregamos a bearerAuthPaths) porque viene del browser sin
 * sesión todavía.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const errorMsg = url.searchParams.get("error_message") || url.searchParams.get("error")

  const baseAdmin = `${url.origin}/admin/meta`

  if (errorMsg) {
    return NextResponse.redirect(
      `${baseAdmin}?error=${encodeURIComponent(errorMsg)}`
    )
  }
  if (!code) {
    return NextResponse.redirect(`${baseAdmin}?error=no_code`)
  }

  try {
    // 1) Code → short-lived user token
    const shortToken = await exchangeCodeForToken(code)

    // 2) short → long-lived user token (~60 días)
    const longToken = await getLongLivedUserToken(shortToken.access_token)

    // 3) Datos del user
    const user = await getUserInfo(longToken.access_token)

    // 4) Lista de pages que administra
    const pages = await getPages(longToken.access_token)
    if (pages.length === 0) {
      return NextResponse.redirect(
        `${baseAdmin}?error=${encodeURIComponent(
          "No se encontraron páginas de Facebook que administres con esta cuenta"
        )}`
      )
    }

    // 5) Tomamos la primera page (Motos Fernandez debería tener una sola).
    //    Si en el futuro hay varias, podemos mostrar UI para elegir.
    const page = pages[0]

    // 6) Cuenta IG Business linkeada a la page
    const ig = await getIGAccountForPage(page.id, page.access_token)
    if (!ig) {
      return NextResponse.redirect(
        `${baseAdmin}?error=${encodeURIComponent(
          `La página "${page.name}" no tiene una cuenta de Instagram Business vinculada. Vinculala desde Configuración de la página → Instagram.`
        )}`
      )
    }

    // 7) Guardar en MetaConfig (única fila id="default")
    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : null

    await prisma.metaConfig.upsert({
      where: { id: "default" },
      update: {
        userId: user.id,
        userName: user.name,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        igUserId: ig.id,
        igUsername: ig.username,
        expiresAt,
      },
      create: {
        id: "default",
        userId: user.id,
        userName: user.name,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        igUserId: ig.id,
        igUsername: ig.username,
        expiresAt,
      },
    })

    return NextResponse.redirect(`${baseAdmin}?ok=1`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.redirect(`${baseAdmin}?error=${encodeURIComponent(msg)}`)
  }
}

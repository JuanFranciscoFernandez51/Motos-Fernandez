import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes (except login)
  if (pathname.match(/^\/admin\/(?!login)/)) {
    const token = await getToken({ req: request })

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    // Excepciones: endpoints que tienen su propia auth con Bearer token
    // (cron de Vercel + scripts manuales). NO usan cookie de NextAuth.
    const bearerAuthPaths = [
      "/api/admin/backup",
      "/api/admin/backup-sheets",
      "/api/admin/backup-check",
      // Mercado Libre: callback (lo llama ML al volver del OAuth, sin cookie)
      // y webhook (lo llama ML al haber novedades en items/orders/questions).
      "/api/admin/ml/callback",
      "/api/admin/ml/webhook",
      "/api/admin/ml/debug",
    ]
    if (bearerAuthPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next()
    }

    const token = await getToken({ req: request })

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/((?!login).*)", "/api/admin/:path*"],
}

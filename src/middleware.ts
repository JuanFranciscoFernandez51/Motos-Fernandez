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

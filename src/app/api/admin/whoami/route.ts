import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Endpoint de debug: devuelve la sesión actual + el usuario en la DB.
 * Sirve para diagnosticar si el JWT cookie está desactualizado vs el
 * estado real del usuario en la base (ej: después de cambiar permisos
 * o role y antes de re-loguearse).
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 })
  }
  const userId = session.user?.id
  const userInDb = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permisos: true,
          activo: true,
        },
      })
    : null
  return NextResponse.json({
    session: {
      user: session.user,
    },
    userInDb,
    // Si role en JWT difiere del de DB → hace falta logout/login para refrescar
    jwtStaleP:
      !!userInDb && session.user?.role !== userInDb.role,
  })
}

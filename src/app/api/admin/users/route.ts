import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireFullAdmin } from "@/lib/admin-auth"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/users
 * Lista todos los usuarios. Solo admins (requireFullAdmin).
 */
export async function GET() {
  const session = await requireFullAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const usuarios = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permisos: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json(usuarios)
}

/**
 * POST /api/admin/users
 * Crea un usuario nuevo. Solo admins.
 * Body: { name, email (= username), password, role?, permisos?, activo? }
 */
export async function POST(request: Request) {
  const session = await requireFullAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const body = await request.json()
    const name = String(body.name ?? "").trim()
    // Sanitizamos el username: quitamos espacios, tildes y caracteres
    // raros. Asi el admin puede tipear como quiera y guardamos un
    // username limpio y consistente.
    const emailRaw = String(body.email ?? "").trim().toLowerCase()
    const email = emailRaw
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // quitar tildes
      .replace(/\s+/g, "") // quitar espacios
      .replace(/[^a-z0-9._@-]/g, "") // quitar caracteres no soportados
    const password = String(body.password ?? "")
    const role = body.role === "admin" ? "admin" : "usuario"
    const permisos = Array.isArray(body.permisos)
      ? (body.permisos as string[]).filter((p) => typeof p === "string")
      : []
    const activo = body.activo !== false

    if (!name) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 })
    if (!email) {
      return NextResponse.json(
        { error: `Usuario obligatorio o inválido (recibido: "${emailRaw}"). Usá letras, números, . _ @ -` },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    // No permitir crear duplicados
    const exist = await prisma.user.findUnique({ where: { email } })
    if (exist) {
      return NextResponse.json(
        { error: `Ya existe un usuario con el nombre "${email}". Probá con otro.` },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role,
        permisos: role === "admin" ? [] : permisos,
        activo,
      },
      select: { id: true, name: true, email: true, role: true, permisos: true, activo: true },
    })
    revalidatePath("/admin/usuarios")
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    console.error("[users.POST] Error:", e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: `Error al crear usuario: ${msg}` },
      { status: 500 }
    )
  }
}

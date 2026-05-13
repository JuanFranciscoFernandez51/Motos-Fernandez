import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireFullAdmin } from "@/lib/admin-auth"
import { hash } from "bcryptjs"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/admin/users/[id]
 * Actualiza un usuario. Solo admins. Soporta:
 *  - name, role, permisos, activo
 *  - password (opcional, si viene la cambia)
 *
 * No se puede borrar el propio usuario admin a si mismo via API
 * (precaucion para no quedar sin admin). Para eso usar DELETE
 * desde otra cuenta admin.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireFullAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  try {
    const data: Record<string, unknown> = {}
    if (typeof body.name === "string") data.name = body.name.trim()
    if (body.role === "admin" || body.role === "usuario") data.role = body.role
    if (Array.isArray(body.permisos)) {
      data.permisos = (body.permisos as unknown[]).filter(
        (p) => typeof p === "string"
      )
    }
    if (typeof body.activo === "boolean") {
      // No permitir auto-desactivarse para no perder acceso
      if (id === session.user.id && body.activo === false) {
        return NextResponse.json(
          { error: "No te podés desactivar a vos mismo" },
          { status: 400 }
        )
      }
      data.activo = body.activo
    }
    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        )
      }
      data.hashedPassword = await hash(body.password, 10)
    }

    // Si pasamos role=admin, vaciamos permisos (los admins no los usan).
    if (data.role === "admin") data.permisos = []

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, permisos: true, activo: true },
    })
    revalidatePath("/admin/usuarios")
    return NextResponse.json(user)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Elimina un usuario. Solo admins. No permite borrarse a si mismo.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireFullAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "No te podés borrar a vos mismo" },
      { status: 400 }
    )
  }
  try {
    await prisma.user.delete({ where: { id } })
    revalidatePath("/admin/usuarios")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al eliminar" },
      { status: 500 }
    )
  }
}

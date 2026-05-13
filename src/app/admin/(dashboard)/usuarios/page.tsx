import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFullAdmin } from "@/lib/admin-auth"
import { UsuariosClient, type UsuarioUI } from "./usuarios-client"

export const dynamic = "force-dynamic"

export default async function UsuariosPage() {
  const session = await requireFullAdmin()
  if (!session) redirect("/admin")

  const usuarios = await prisma.user.findMany({
    orderBy: [{ activo: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permisos: true,
      activo: true,
      createdAt: true,
    },
  })

  const ui: UsuarioUI[] = usuarios.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    permisos: u.permisos,
    activo: u.activo,
    createdAt: u.createdAt.toISOString(),
  }))

  return <UsuariosClient usuarios={ui} currentUserId={session.user.id} />
}

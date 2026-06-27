import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const SELECT = { id: true, nombre: true, apellido: true, dni: true, telefono: true, email: true } as const

/**
 * GET /api/admin/clientes/search?q=texto&take=15
 *   → busca clientes por nombre/apellido/DNI/teléfono/email (máx `take`).
 * GET /api/admin/clientes/search?id=abc
 *   → devuelve un cliente puntual (para mostrar el seleccionado al editar).
 *
 * Reemplaza la precarga de los ~2700 clientes en cada formulario: ahora el
 * ClienteSelector busca a medida que se tipea, server-side.
 */
export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()
  if (id) {
    const cliente = await prisma.cliente.findUnique({ where: { id }, select: SELECT })
    return NextResponse.json({ clientes: cliente ? [cliente] : [] })
  }

  const q = (searchParams.get("q") || "").trim()
  const take = Math.min(30, Math.max(1, parseInt(searchParams.get("take") || "15") || 15))

  // Sin término: los más recientes (útil para abrir el dropdown vacío).
  if (!q) {
    const clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: SELECT,
    })
    return NextResponse.json({ clientes })
  }

  // Cada palabra del query debe matchear en algún campo (AND de ORs) — así
  // "perez juan" encuentra a Juan Pérez aunque estén en campos distintos.
  const palabras = q.split(/\s+/).filter(Boolean).slice(0, 4)
  const and = palabras.map((palabra) => ({
    OR: [
      { nombre: { contains: palabra, mode: "insensitive" as const } },
      { apellido: { contains: palabra, mode: "insensitive" as const } },
      { dni: { contains: palabra } },
      { telefono: { contains: palabra } },
      { email: { contains: palabra, mode: "insensitive" as const } },
    ],
  }))

  const clientes = await prisma.cliente.findMany({
    where: { AND: and },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    take,
    select: SELECT,
  })
  return NextResponse.json({ clientes })
}

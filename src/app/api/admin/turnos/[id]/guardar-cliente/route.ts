import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * Convierte un turno en un Cliente del CRM (o lo vincula a uno existente
 * si ya hay matchby DNI).
 *
 * - Si el turno ya tiene clienteId, no hace nada.
 * - Si existe un Cliente con el mismo DNI, vincula el turno a ese.
 * - Sino crea un Cliente nuevo con los datos del turno.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const turno = await prisma.turno.findUnique({ where: { id } })
  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
  }
  if (turno.clienteId) {
    return NextResponse.json({ ok: true, clienteId: turno.clienteId, message: "Ya tenía cliente vinculado" })
  }

  // Parsear apellido del nombre completo si no viene separado
  const partes = (turno.nombre || "").trim().split(/\s+/).filter(Boolean)
  const nombre = partes[0] || turno.nombre || "Sin nombre"
  const apellido = turno.apellido || (partes.length > 1 ? partes.slice(1).join(" ") : "Sin apellido")

  try {
    let cliente = turno.dni
      ? await prisma.cliente.findUnique({ where: { dni: turno.dni } })
      : null

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre,
          apellido,
          dni: turno.dni || null,
          telefono: turno.telefono,
          email: turno.email,
          ciudad: "Bahía Blanca",
          provincia: "Buenos Aires",
          notasInternas: `Cliente creado a partir del turno del ${turno.createdAt.toISOString().split("T")[0]}.\nServicio solicitado: ${turno.tipoServicio}\nMoto: ${turno.modeloMoto || "—"}`,
        },
      })
    }

    await prisma.turno.update({
      where: { id },
      data: { clienteId: cliente.id },
    })

    revalidatePath("/admin/turnos")
    revalidatePath("/admin/clientes")
    return NextResponse.json({ ok: true, clienteId: cliente.id, nuevo: !cliente.notasInternas?.includes("Cliente creado a partir del turno") ? false : true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

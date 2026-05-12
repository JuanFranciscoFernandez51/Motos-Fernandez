import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * Crea una Orden de Trabajo a partir de un turno. Pasos:
 *  1. Si el turno no tiene cliente vinculado, lo crea/vincula (matchea
 *     por DNI si existe).
 *  2. Crea la OT en estado INGRESADA con los datos del turno
 *     (cliente, moto, motivo de ingreso = tipo de servicio + comentarios).
 *  3. Vincula la OT al turno y marca el turno como CONFIRMADO/COMPLETADO.
 *
 * Si el turno ya tiene OT vinculada, devuelve esa misma (idempotente).
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
  if (turno.ordenTrabajoId) {
    return NextResponse.json({
      ok: true,
      ordenTrabajoId: turno.ordenTrabajoId,
      message: "El turno ya tenía OT",
    })
  }

  try {
    const ot = await prisma.$transaction(async (tx) => {
      // 1) Asegurar cliente
      let clienteId = turno.clienteId
      if (!clienteId) {
        const partes = (turno.nombre || "").trim().split(/\s+/).filter(Boolean)
        const nombre = partes[0] || turno.nombre || "Sin nombre"
        const apellido = turno.apellido || (partes.length > 1 ? partes.slice(1).join(" ") : "Sin apellido")

        const existente = turno.dni
          ? await tx.cliente.findUnique({ where: { dni: turno.dni } })
          : null
        if (existente) {
          clienteId = existente.id
        } else {
          const c = await tx.cliente.create({
            data: {
              nombre,
              apellido,
              dni: turno.dni || null,
              telefono: turno.telefono,
              email: turno.email,
              ciudad: "Bahía Blanca",
              provincia: "Buenos Aires",
              notasInternas: `Cliente creado a partir del turno del ${turno.createdAt.toISOString().split("T")[0]}.\nServicio: ${turno.tipoServicio}`,
            },
          })
          clienteId = c.id
        }
        await tx.turno.update({
          where: { id: turno.id },
          data: { clienteId },
        })
      }

      // 2) Crear la OT
      // Parsear marca/modelo del campo `modeloMoto` libre
      const motoTxt = (turno.modeloMoto || "Moto").trim()
      const partesMoto = motoTxt.split(/\s+/).filter(Boolean)
      const motoMarca = partesMoto[0] || "Moto"
      const motoModelo = partesMoto.slice(1).join(" ") || motoTxt

      const ot = await tx.ordenTrabajo.create({
        data: {
          clienteId,
          modeloId: turno.modeloId,
          motoMarca,
          motoModelo,
          motivoIngreso: [turno.tipoServicio, turno.comentarios]
            .filter(Boolean)
            .join(" — "),
          estado: "INGRESADA",
          fechaIngreso: turno.fechaConfirmada || new Date(),
        },
      })

      // 3) Vincular OT al turno y avanzar estado
      await tx.turno.update({
        where: { id: turno.id },
        data: {
          ordenTrabajoId: ot.id,
          estado: turno.estado === "PENDIENTE" ? "CONFIRMADO" : turno.estado,
        },
      })

      return ot
    })

    revalidatePath("/admin/turnos")
    revalidatePath("/admin/taller")
    revalidatePath("/admin/clientes")
    return NextResponse.json({ ok: true, ordenTrabajoId: ot.id, numero: ot.numero })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

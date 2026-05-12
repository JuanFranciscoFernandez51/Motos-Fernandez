import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/admin/outreach/[id]
 * Acciones soportadas en body.accion:
 *  - "enviada"     → marca como ENVIADA y graba enviadaAt = now
 *  - "descartada"  → marca como DESCARTADA y graba descartadaAt = now
 *  - "respondida"  → marca como RESPONDIDA y guarda body.respuesta
 *  - "reprogramar" → vuelve a PROGRAMADA (por si el admin se equivocó)
 *  - "editarMensaje" → cambia el mensaje (antes de mandar)
 *  - "editarTelefono" → cambia el teléfono (antes de mandar)
 *  - "nota"        → solo agrega notaInterna sin cambiar estado
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const accion: string = body.accion || ""

  try {
    const data: Record<string, unknown> = {}
    if (accion === "enviada") {
      data.estado = "ENVIADA"
      data.enviadaAt = new Date()
    } else if (accion === "descartada") {
      data.estado = "DESCARTADA"
      data.descartadaAt = new Date()
    } else if (accion === "respondida") {
      data.estado = "RESPONDIDA"
      data.respuesta = body.respuesta || null
    } else if (accion === "reprogramar") {
      data.estado = "PROGRAMADA"
      data.enviadaAt = null
      data.descartadaAt = null
    } else if (accion === "editarMensaje") {
      data.mensaje = String(body.mensaje || "").trim()
    } else if (accion === "editarTelefono") {
      data.telefono = String(body.telefono || "").trim() || null
    } else if (accion === "nota") {
      data.notaInterna = body.notaInterna || null
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }

    const tarea = await prisma.outreachTarea.update({
      where: { id },
      data,
    })
    revalidatePath("/admin/outreach")
    return NextResponse.json({ ok: true, tarea })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/admin/outreach/[id]
 * Elimina la tarea de la cola (uso poco frecuente, normalmente se usa
 * "descartada" para conservar el log).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  await prisma.outreachTarea.delete({ where: { id } })
  revalidatePath("/admin/outreach")
  return NextResponse.json({ ok: true })
}

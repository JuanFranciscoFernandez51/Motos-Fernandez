import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * DELETE cliente. Verifica que no tenga OCs, mandatos, financiaciones,
 * ni órdenes de trabajo asociadas — sino devuelve 400 con mensaje claro.
 * Eliminar un cliente con historial rompería la trazabilidad.
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

  // Verificar dependencias
  const [ocs, mandatos, fins, ots] = await Promise.all([
    prisma.ordenCompra.count({ where: { clienteId: id } }),
    prisma.mandatoVenta.count({ where: { clienteId: id } }),
    prisma.financiacionOC.count({ where: { clienteId: id } }),
    prisma.ordenTrabajo.count({ where: { clienteId: id } }),
  ])
  const relaciones: string[] = []
  if (ocs > 0) relaciones.push(`${ocs} OC${ocs === 1 ? "" : "s"}`)
  if (mandatos > 0) relaciones.push(`${mandatos} mandato${mandatos === 1 ? "" : "s"}`)
  if (fins > 0) relaciones.push(`${fins} financiacion${fins === 1 ? "" : "es"}`)
  if (ots > 0) relaciones.push(`${ots} orden${ots === 1 ? "" : "es"} de taller`)
  if (relaciones.length > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar: el cliente tiene ${relaciones.join(", ")} asociadas. Primero eliminá esos registros o cambiale el cliente.`,
      },
      { status: 400 }
    )
  }

  try {
    await prisma.cliente.delete({ where: { id } })
    revalidatePath("/admin/clientes")
    revalidatePath("/admin/crm")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al eliminar" },
      { status: 400 }
    )
  }
}

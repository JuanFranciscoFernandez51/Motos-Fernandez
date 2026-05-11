import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * GET cliente con todos los campos editables — usado por el modal de
 * quick-edit para precargar el form. El selector solo tiene los básicos
 * (nombre, apellido, dni, telefono, email).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      cuit: true,
      telefono: true,
      telefonoAlt: true,
      email: true,
      direccion: true,
      ciudad: true,
      provincia: true,
      codigoPostal: true,
      ocupacion: true,
      notasInternas: true,
    },
  })
  if (!cliente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }
  return NextResponse.json({ cliente })
}

/**
 * PATCH cliente. Edición rápida de los campos básicos desde el form de
 * OC o Mandato (cuando al cliente le faltan datos y no querés salir
 * del form actual). Solo actualiza los campos que llegan en el body —
 * no toca el resto. Devuelve el cliente con la shape de ClienteOption
 * para que el selector lo refresque in-place.
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

  const norm = (v: unknown): string | null | undefined => {
    if (v === undefined) return undefined // no tocar
    if (typeof v !== "string") return null
    const t = v.trim()
    return t || null
  }
  const data: Record<string, string | null> = {}
  for (const key of [
    "nombre",
    "apellido",
    "dni",
    "cuit",
    "email",
    "telefono",
    "telefonoAlt",
    "direccion",
    "ciudad",
    "provincia",
    "codigoPostal",
    "ocupacion",
    "notasInternas",
  ] as const) {
    const v = norm(body[key])
    if (v !== undefined) data[key] = v
  }
  // Nombre y apellido NO pueden quedar vacíos
  if (data.nombre === null || data.apellido === null) {
    return NextResponse.json(
      { error: "Nombre y apellido no pueden quedar vacíos" },
      { status: 400 }
    )
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        telefono: true,
        email: true,
      },
    })
    revalidatePath("/admin/clientes")
    revalidatePath(`/admin/clientes/${id}`)
    revalidatePath("/admin/crm")
    return NextResponse.json({ cliente })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error al actualizar"
    if (msg.includes("Unique constraint") && msg.includes("dni")) {
      return NextResponse.json(
        { error: "Ya existe otro cliente con ese DNI" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

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

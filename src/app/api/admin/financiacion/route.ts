import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const planes = await prisma.planFinanciacion.findMany({ orderBy: { orden: "asc" } })
  return NextResponse.json(planes)
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await request.json()
  const plan = await prisma.planFinanciacion.create({
    data: {
      nombre: body.nombre,
      tipo: body.tipo ?? "PROPIA",
      cuotas: Number(body.cuotas),
      coeficiente: Number(body.coeficiente),
      anticipoMinimo: Number(body.anticipoMinimo) || 0,
      descripcion: body.descripcion || null,
      orden: Number(body.orden) || 0,
      activo: body.activo ?? true,
    },
  })
  return NextResponse.json(plan, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  const body = await request.json()
  const plan = await prisma.planFinanciacion.update({
    where: { id },
    data: {
      nombre: body.nombre,
      tipo: body.tipo ?? "PROPIA",
      cuotas: Number(body.cuotas),
      coeficiente: Number(body.coeficiente),
      anticipoMinimo: Number(body.anticipoMinimo) || 0,
      descripcion: body.descripcion || null,
      orden: Number(body.orden) || 0,
      activo: body.activo,
    },
  })
  return NextResponse.json(plan)
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  await prisma.planFinanciacion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

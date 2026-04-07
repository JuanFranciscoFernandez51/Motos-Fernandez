import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  const temp = searchParams.get("temp")
  const etapa = searchParams.get("etapa")
  const origen = searchParams.get("origen")

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { apellido: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { telefono: { contains: q, mode: "insensitive" } },
    ]
  }
  if (temp) where.temperatura = temp
  if (etapa) where.etapa = etapa
  if (origen) where.origen = origen

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { modelo: true },
  })

  const rows = [
    ["Nombre", "Apellido", "Telefono", "Email", "Ciudad", "Modelo Interes", "Origen", "Temperatura", "Etapa", "Notas", "Fecha"],
    ...leads.map(l => [
      l.nombre,
      l.apellido || "",
      l.telefono || "",
      l.email || "",
      l.ciudad || "",
      l.modelo?.nombre || l.modeloInteres || "",
      l.origen,
      l.temperatura,
      l.etapa,
      l.notas || "",
      l.createdAt.toLocaleDateString("es-AR"),
    ]),
  ]

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n")

  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
    },
  })
}

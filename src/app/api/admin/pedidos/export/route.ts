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
  const estado = searchParams.get("estado")
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { apellido: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]
  }
  if (estado) where.estado = estado
  if (desde || hasta) {
    where.createdAt = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(`${hasta}T23:59:59`) } : {}),
    }
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: { include: { producto: true } } },
  })

  const rows = [
    ["#", "Nombre", "Apellido", "Email", "Telefono", "Items", "Subtotal", "Descuento", "Envio", "Total", "Estado", "Pago", "Tipo Entrega", "Direccion", "Ciudad", "Provincia", "Cupon", "Fecha"],
    ...pedidos.map(p => [
      p.numero,
      p.nombre,
      p.apellido || "",
      p.email,
      p.telefono || "",
      p.items.map(i => `${i.producto.nombre} x${i.cantidad}`).join(" | "),
      p.subtotal,
      p.descuento,
      p.costoEnvio,
      p.total,
      p.estado,
      p.estadoPago,
      p.tipoEntrega,
      p.direccion || "",
      p.ciudad || "",
      p.provincia || "",
      p.cuponCodigo || "",
      p.createdAt.toLocaleDateString("es-AR"),
    ]),
  ]

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n")

  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${date}.csv"`,
    },
  })
}

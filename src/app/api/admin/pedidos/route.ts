import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const pedidos = await prisma.pedido.findMany({
    include: {
      items: {
        include: { producto: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(pedidos)
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { fechaDeInput } from "@/lib/finanzas"

export async function GET(req: NextRequest) {
  const sentido = new URL(req.url).searchParams.get("sentido")
  const cobros = await prisma.cuentaPorCobrar.findMany({
    where: sentido ? { sentido } : undefined,
    orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(cobros)
}

/** POST → crea una cuenta a cobrar. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.cliente || b.monto == null) {
      return NextResponse.json({ error: "Cliente y monto son obligatorios" }, { status: 400 })
    }
    const cobro = await prisma.cuentaPorCobrar.create({
      data: {
        sentido: b.sentido === "PAGAR" ? "PAGAR" : "COBRAR",
        cliente: String(b.cliente).trim(),
        tipo: b.tipo || "Crédito personal",
        descripcion: b.descripcion || null,
        monto: Math.abs(Math.round(Number(b.monto))),
        moneda: b.moneda === "USD" ? "USD" : "ARS",
        fechaVencimiento: b.fechaVencimiento ? fechaDeInput(b.fechaVencimiento) : null,
        observaciones: b.observaciones || null,
      },
    })
    revalidatePath("/admin/finanzas")
    return NextResponse.json(cobro)
  } catch (err) {
    console.error("POST cuenta a cobrar:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

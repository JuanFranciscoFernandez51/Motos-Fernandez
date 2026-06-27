import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function GET() {
  const costos = await prisma.costoFijo.findMany({ orderBy: { orden: "asc" } })
  return NextResponse.json(costos)
}

/** POST → crea un concepto de costo fijo. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.concepto) return NextResponse.json({ error: "Falta el concepto" }, { status: 400 })
    const max = await prisma.costoFijo.aggregate({ _max: { orden: true } })
    const costo = await prisma.costoFijo.create({
      data: {
        concepto: b.concepto,
        categoria: b.categoria || "Otros",
        monto: Math.round(Number(b.monto) || 0),
        notas: b.notas || null,
        orden: (max._max.orden ?? 0) + 1,
      },
    })
    revalidatePath("/admin/finanzas")
    return NextResponse.json(costo)
  } catch (err) {
    console.error("POST costo fijo:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

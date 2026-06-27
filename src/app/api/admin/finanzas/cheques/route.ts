import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { fechaDeInput } from "@/lib/finanzas"

export async function GET() {
  const cheques = await prisma.cheque.findMany({ orderBy: { fechaVencimiento: "asc" } })
  return NextResponse.json(cheques)
}

/** POST → crea un cheque a cobrar o a pagar. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.tipo || !b.beneficiario || b.monto == null || !b.fechaVencimiento) {
      return NextResponse.json({ error: "Tipo, beneficiario, monto y vencimiento son obligatorios" }, { status: 400 })
    }
    const cheque = await prisma.cheque.create({
      data: {
        tipo: b.tipo === "A_PAGAR" ? "A_PAGAR" : "A_COBRAR",
        beneficiario: b.beneficiario,
        monto: Math.abs(Math.round(Number(b.monto))),
        moneda: b.moneda === "USD" ? "USD" : "ARS",
        fechaVencimiento: fechaDeInput(b.fechaVencimiento),
        formato: b.formato || "E-Cheq",
        observaciones: b.observaciones || null,
      },
    })
    revalidatePath("/admin/finanzas")
    return NextResponse.json(cheque)
  } catch (err) {
    console.error("POST cheque:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

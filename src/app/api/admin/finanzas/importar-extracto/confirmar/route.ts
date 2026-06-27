import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

export const dynamic = "force-dynamic"

/** POST (JSON: { cuentaId, movimientos[] }) → inserta los movimientos revisados. */
export async function POST(req: NextRequest) {
  try {
    const { cuentaId, movimientos } = await req.json()
    if (!cuentaId || !Array.isArray(movimientos) || movimientos.length === 0) {
      return NextResponse.json({ error: "Falta la cuenta o los movimientos" }, { status: 400 })
    }
    const cuenta = await prisma.cuentaFinanciera.findUnique({ where: { id: cuentaId } })
    if (!cuenta) return NextResponse.json({ error: "Cuenta inexistente" }, { status: 400 })

    const data = movimientos
      .filter((m: { fecha?: string; monto?: number }) => m.fecha && m.monto != null)
      .map((m: { fecha: string; descripcion?: string; monto: number; tipo: string; categoria?: string }) => {
        const tipo = m.tipo === "INGRESO" ? "INGRESO" : m.tipo === "TRANSFERENCIA" ? "TRANSFERENCIA" : "GASTO"
        const monto = tipo === "TRANSFERENCIA" ? Math.round(m.monto) : Math.abs(Math.round(m.monto))
        return {
          fecha: fechaDeInput(m.fecha),
          tipo: tipo as "INGRESO" | "GASTO" | "TRANSFERENCIA",
          categoria: m.categoria || (tipo === "INGRESO" ? "Otros Ingresos" : "Otros Gastos"),
          descripcion: m.descripcion || "",
          monto,
          moneda: cuenta.moneda,
          cuentaId,
          observaciones: "Importado de extracto",
        }
      })

    const res = await prisma.movimientoFinanciero.createMany({ data })
    return NextResponse.json({ ok: true, insertados: res.count })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 })
  }
}

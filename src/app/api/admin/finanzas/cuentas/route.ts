import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** GET → todas las cuentas. */
export async function GET() {
  const cuentas = await prisma.cuentaFinanciera.findMany({ orderBy: { orden: "asc" } })
  return NextResponse.json(cuentas)
}

/** POST → crea una cuenta nueva. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const { nombre, moneda, saldoInicial, excluirDeResultado } = b
    if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })

    const max = await prisma.cuentaFinanciera.aggregate({ _max: { orden: true } })
    const cuenta = await prisma.cuentaFinanciera.create({
      data: {
        nombre,
        moneda: moneda === "USD" ? "USD" : "ARS",
        saldoInicial: Math.round(Number(saldoInicial) || 0),
        excluirDeResultado: !!excluirDeResultado,
        orden: (max._max.orden ?? 0) + 1,
      },
    })
    return NextResponse.json(cuenta)
  } catch (err) {
    console.error("POST cuenta:", err)
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una cuenta con ese nombre" }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

/** PUT → edita una cuenta (saldo inicial, nombre, activa, etc.). Body incluye id. */
export async function PUT(req: NextRequest) {
  try {
    const b = await req.json()
    const { id, nombre, moneda, saldoInicial, excluirDeResultado, activa } = b
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

    const cuenta = await prisma.cuentaFinanciera.update({
      where: { id },
      data: {
        nombre: nombre ?? undefined,
        moneda: moneda ? (moneda === "USD" ? "USD" : "ARS") : undefined,
        saldoInicial: saldoInicial != null ? Math.round(Number(saldoInicial)) : undefined,
        excluirDeResultado: excluirDeResultado !== undefined ? !!excluirDeResultado : undefined,
        activa: activa !== undefined ? !!activa : undefined,
      },
    })
    return NextResponse.json(cuenta)
  } catch (err) {
    console.error("PUT cuenta:", err)
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una cuenta con ese nombre" }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

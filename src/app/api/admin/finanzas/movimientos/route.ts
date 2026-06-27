import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

/**
 * GET → lista de movimientos con filtros opcionales (?mes=&anio=&cuentaId=&tipo=).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mes = searchParams.get("mes")
  const anio = searchParams.get("anio")
  const cuentaId = searchParams.get("cuentaId")
  const tipo = searchParams.get("tipo")

  const where: Record<string, unknown> = {}
  if (cuentaId) where.cuentaId = cuentaId
  if (tipo) where.tipo = tipo
  if (mes && anio) {
    const m = Number(mes) - 1
    const y = Number(anio)
    where.fecha = { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) }
  } else if (anio) {
    const y = Number(anio)
    where.fecha = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) }
  }

  const movimientos = await prisma.movimientoFinanciero.findMany({
    where,
    include: { cuenta: true },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(movimientos)
}

/**
 * POST → crea un movimiento INGRESO o GASTO.
 * (Las transferencias van por /api/admin/finanzas/transferencia)
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const { fecha, tipo, categoria, descripcion, monto, cuentaId, comprobante, observaciones } = b

    if (!fecha || !tipo || !cuentaId || monto == null) {
      return NextResponse.json({ error: "Fecha, tipo, cuenta y monto son obligatorios" }, { status: 400 })
    }
    if (tipo !== "INGRESO" && tipo !== "GASTO") {
      return NextResponse.json({ error: "Tipo inválido (usá /transferencia para transferencias)" }, { status: 400 })
    }

    const cuenta = await prisma.cuentaFinanciera.findUnique({ where: { id: cuentaId } })
    if (!cuenta) return NextResponse.json({ error: "Cuenta inexistente" }, { status: 400 })

    const mov = await prisma.movimientoFinanciero.create({
      data: {
        fecha: fechaDeInput(fecha),
        tipo,
        categoria: categoria || (tipo === "INGRESO" ? "Otros Ingresos" : "Otros Gastos"),
        descripcion: descripcion || "",
        monto: Math.abs(Math.round(Number(monto))),
        moneda: cuenta.moneda,
        cuentaId,
        comprobante: comprobante || null,
        observaciones: observaciones || null,
      },
      include: { cuenta: true },
    })
    return NextResponse.json(mov)
  } catch (err) {
    console.error("POST movimiento:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

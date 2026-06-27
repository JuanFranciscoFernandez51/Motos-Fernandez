import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { CATEGORIA_TRANSFERENCIA, fechaDeInput } from "@/lib/finanzas"

/**
 * POST → transferencia entre cuentas en un solo paso.
 * Crea las dos patas (salida en origen, entrada en destino) vinculadas por transferenciaId.
 * Soporta cambio de divisa: si montoDestino viene distinto, se usa ese (ej. cambio USD→ARS).
 * Body: { fecha, cuentaOrigenId, cuentaDestinoId, montoOrigen, montoDestino?, descripcion }
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const { fecha, cuentaOrigenId, cuentaDestinoId, montoOrigen, montoDestino, descripcion } = b

    if (!fecha || !cuentaOrigenId || !cuentaDestinoId || montoOrigen == null) {
      return NextResponse.json(
        { error: "Fecha, cuenta origen, cuenta destino y monto son obligatorios" },
        { status: 400 }
      )
    }
    if (cuentaOrigenId === cuentaDestinoId) {
      return NextResponse.json({ error: "La cuenta origen y destino no pueden ser la misma" }, { status: 400 })
    }

    const [origen, destino] = await Promise.all([
      prisma.cuentaFinanciera.findUnique({ where: { id: cuentaOrigenId } }),
      prisma.cuentaFinanciera.findUnique({ where: { id: cuentaDestinoId } }),
    ])
    if (!origen || !destino) {
      return NextResponse.json({ error: "Cuenta inexistente" }, { status: 400 })
    }

    const mOrigen = Math.abs(Math.round(Number(montoOrigen)))
    const mDestino =
      montoDestino != null ? Math.abs(Math.round(Number(montoDestino))) : mOrigen

    const transferenciaId = randomUUID()
    const desc = descripcion || `Transferencia ${origen.nombre} → ${destino.nombre}`
    const f = fechaDeInput(fecha)

    await prisma.movimientoFinanciero.createMany({
      data: [
        {
          fecha: f,
          tipo: "TRANSFERENCIA",
          categoria: CATEGORIA_TRANSFERENCIA,
          descripcion: desc,
          monto: -mOrigen, // salida
          moneda: origen.moneda,
          cuentaId: origen.id,
          transferenciaId,
        },
        {
          fecha: f,
          tipo: "TRANSFERENCIA",
          categoria: CATEGORIA_TRANSFERENCIA,
          descripcion: desc,
          monto: mDestino, // entrada
          moneda: destino.moneda,
          cuentaId: destino.id,
          transferenciaId,
        },
      ],
    })

    return NextResponse.json({ ok: true, transferenciaId })
  } catch (err) {
    console.error("POST transferencia:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

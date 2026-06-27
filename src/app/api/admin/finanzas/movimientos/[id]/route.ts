import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fechaDeInput } from "@/lib/finanzas"

/**
 * PUT → edita un movimiento INGRESO/GASTO.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const { fecha, tipo, categoria, descripcion, monto, cuentaId, comprobante, observaciones } = b

    const actual = await prisma.movimientoFinanciero.findUnique({ where: { id } })
    if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (actual.transferenciaId) {
      return NextResponse.json(
        { error: "Las transferencias se editan borrándolas y cargándolas de nuevo" },
        { status: 400 }
      )
    }

    const cuenta = cuentaId
      ? await prisma.cuentaFinanciera.findUnique({ where: { id: cuentaId } })
      : null

    const mov = await prisma.movimientoFinanciero.update({
      where: { id },
      data: {
        fecha: fecha ? fechaDeInput(fecha) : undefined,
        tipo: tipo ?? undefined,
        categoria: categoria ?? undefined,
        descripcion: descripcion ?? undefined,
        monto: monto != null ? Math.abs(Math.round(Number(monto))) : undefined,
        cuentaId: cuentaId ?? undefined,
        moneda: cuenta ? cuenta.moneda : undefined,
        comprobante: comprobante !== undefined ? comprobante || null : undefined,
        observaciones: observaciones !== undefined ? observaciones || null : undefined,
      },
      include: { cuenta: true },
    })
    return NextResponse.json(mov)
  } catch (err) {
    console.error("PUT movimiento:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

/**
 * PATCH → edición inline (un campo por vez) de un movimiento INGRESO/GASTO.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const actual = await prisma.movimientoFinanciero.findUnique({ where: { id } })
    if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (actual.transferenciaId) {
      return NextResponse.json({ error: "Las transferencias se editan borrándolas y recargándolas" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if ("fecha" in body) data.fecha = fechaDeInput(body.fecha)
    if ("categoria" in body) data.categoria = body.categoria
    if ("descripcion" in body) data.descripcion = body.descripcion || ""
    if ("comprobante" in body) data.comprobante = body.comprobante || null
    if ("observaciones" in body) data.observaciones = body.observaciones || null
    if ("monto" in body) data.monto = Math.abs(Math.round(Number(body.monto)))
    if ("cuentaId" in body) {
      const cuenta = await prisma.cuentaFinanciera.findUnique({ where: { id: body.cuentaId } })
      if (!cuenta) return NextResponse.json({ error: "Cuenta inexistente" }, { status: 400 })
      data.cuentaId = body.cuentaId
      data.moneda = cuenta.moneda
    }

    const mov = await prisma.movimientoFinanciero.update({ where: { id }, data, include: { cuenta: true } })
    return NextResponse.json(mov)
  } catch (err) {
    console.error("PATCH movimiento:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

/**
 * DELETE → borra un movimiento. Si es parte de una transferencia, borra las dos patas.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const mov = await prisma.movimientoFinanciero.findUnique({ where: { id } })
    if (!mov) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    if (mov.transferenciaId) {
      await prisma.movimientoFinanciero.deleteMany({ where: { transferenciaId: mov.transferenciaId } })
    } else {
      await prisma.movimientoFinanciero.delete({ where: { id } })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE movimiento:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

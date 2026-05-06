import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const codigo = body.codigo?.toUpperCase()
    // Contexto donde se valida el cupón. Por default "TIENDA" (carrito de productos online).
    // Otros valores posibles: "SERVICIOS"
    const contexto: string = body.contexto || "TIENDA"

    if (!codigo) {
      return NextResponse.json(
        { error: "Código de cupón requerido" },
        { status: 400 }
      )
    }

    const cupon = await prisma.cupon.findUnique({
      where: { codigo },
    })

    if (!cupon) {
      return NextResponse.json(
        { error: "Cupón no encontrado" },
        { status: 404 }
      )
    }

    if (!cupon.activo) {
      return NextResponse.json(
        { error: "Este cupón no está activo" },
        { status: 400 }
      )
    }

    const now = new Date()

    if (cupon.fechaInicio > now) {
      return NextResponse.json(
        { error: "Este cupón aún no está vigente" },
        { status: 400 }
      )
    }

    if (cupon.fechaFin && cupon.fechaFin < now) {
      return NextResponse.json(
        { error: "Este cupón ha expirado" },
        { status: 400 }
      )
    }

    if (cupon.usosMaximos && cupon.usosActuales >= cupon.usosMaximos) {
      return NextResponse.json(
        { error: "Este cupón ha alcanzado el límite de usos" },
        { status: 400 }
      )
    }

    // Validar que el cupón aplique al contexto solicitado
    const aplicaA = cupon.aplicaA && cupon.aplicaA.length > 0 ? cupon.aplicaA : ["TIENDA"]
    if (!aplicaA.includes(contexto)) {
      const lugares = aplicaA
        .map((a) => (a === "TIENDA" ? "tienda" : a === "SERVICIOS" ? "servicios" : a.toLowerCase()))
        .join(" y ")
      return NextResponse.json(
        { error: `Este cupón solo aplica en ${lugares}.` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      codigo: cupon.codigo,
      porcentaje: cupon.porcentaje,
      montoMaximo: cupon.montoMaximo,
      montoMinimo: cupon.montoMinimo,
      descripcion: cupon.descripcion,
      aplicaA,
    })
  } catch (error) {
    console.error("Error validating cupon:", error)
    return NextResponse.json(
      { error: "Error al validar el cupón" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null

    const conversion = await prisma.conversion.create({
      data: {
        evento: body.evento,
        valor: body.valor ?? null,
        detalle: body.detalle ?? null,
        fuente: body.fuente ?? null,
        ip,
      },
    })

    return NextResponse.json(conversion, { status: 201 })
  } catch (error) {
    console.error("Error creating conversion:", error)
    return NextResponse.json(
      { error: "Error al registrar la conversión" },
      { status: 500 }
    )
  }
}

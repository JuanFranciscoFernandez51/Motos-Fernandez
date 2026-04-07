import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null

    const visita = await prisma.visita.create({
      data: {
        pagina: body.pagina,
        referrer: body.referrer ?? null,
        device: body.device ?? null,
        browser: body.browser ?? null,
        ip,
      },
    })

    return NextResponse.json(visita, { status: 201 })
  } catch (error) {
    console.error("Error creating visita:", error)
    return NextResponse.json(
      { error: "Error al registrar la visita" },
      { status: 500 }
    )
  }
}

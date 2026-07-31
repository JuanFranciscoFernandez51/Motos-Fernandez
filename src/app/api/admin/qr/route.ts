import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const codigo = String(body.codigo || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "")
    if (!codigo) {
      return NextResponse.json(
        { error: "Código requerido (solo letras, números y -)" },
        { status: 400 }
      )
    }
    const data = {
      codigo,
      modeloId: body.modeloId || null,
      urlCustom: body.urlCustom || null,
      descripcion: body.descripcion || null,
      activo: body.activo !== false,
      protegido: !!body.protegido,
    }
    const link = await prisma.qrShortlink.create({ data })
    return NextResponse.json(link)
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return NextResponse.json(
        { error: "Ya existe un shortlink con ese código" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

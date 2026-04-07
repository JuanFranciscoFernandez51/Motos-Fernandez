import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_CONFIG = {
  id: "singleton",
  nombre: "Motos Fernandez",
  descripcion: "Concesionaria multimarca en Bahía Blanca",
  whatsapp: "5492915788671",
  email: "info@motosfernandez.com.ar",
  direccion: "Brown 1052, Bahia Blanca",
  horarioLV: "8:30 - 12:30 / 15:30 - 19:30",
  horarioSab: "9:00 - 13:00",
  mercadopagoHabilitado: true,
  enviosHabilitados: true,
  retiroHabilitado: true,
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const config = await prisma.siteConfig.findUnique({ where: { id: "singleton" } })
    return NextResponse.json(config ?? DEFAULT_CONFIG)
  } catch {
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await request.json()

    const config = await prisma.siteConfig.upsert({
      where: { id: "singleton" },
      update: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        whatsapp: body.whatsapp,
        email: body.email,
        direccion: body.direccion,
        horarioLV: body.horarioLV,
        horarioSab: body.horarioSab,
        mercadopagoHabilitado: Boolean(body.mercadopagoHabilitado),
        enviosHabilitados: Boolean(body.enviosHabilitados),
        retiroHabilitado: Boolean(body.retiroHabilitado),
      },
      create: {
        id: "singleton",
        nombre: body.nombre ?? "Motos Fernandez",
        descripcion: body.descripcion ?? null,
        whatsapp: body.whatsapp ?? "5492915788671",
        email: body.email ?? "info@motosfernandez.com.ar",
        direccion: body.direccion ?? "Brown 1052, Bahia Blanca",
        horarioLV: body.horarioLV ?? "8:30 - 12:30 / 15:30 - 19:30",
        horarioSab: body.horarioSab ?? "9:00 - 13:00",
        mercadopagoHabilitado: body.mercadopagoHabilitado ?? true,
        enviosHabilitados: body.enviosHabilitados ?? true,
        retiroHabilitado: body.retiroHabilitado ?? true,
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error saving config:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }
}

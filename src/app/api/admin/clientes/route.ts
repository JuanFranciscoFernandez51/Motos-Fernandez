import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/admin/clientes — crea cliente rápido desde selector inline
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const nombre = (body.nombre || "").trim()
    const apellido = (body.apellido || "").trim()
    if (!nombre || !apellido) {
      return NextResponse.json(
        { error: "Nombre y apellido son obligatorios" },
        { status: 400 }
      )
    }

    const norm = (v: unknown) => {
      if (typeof v !== "string") return null
      const t = v.trim()
      return t ? t : null
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        apellido,
        dni: norm(body.dni),
        cuit: norm(body.cuit),
        email: norm(body.email),
        telefono: norm(body.telefono),
        telefonoAlt: norm(body.telefonoAlt),
        direccion: norm(body.direccion),
        ciudad: norm(body.ciudad) || "Bahía Blanca",
        provincia: norm(body.provincia) || "Buenos Aires",
        codigoPostal: norm(body.codigoPostal),
        ocupacion: norm(body.ocupacion),
        notasInternas: norm(body.notasInternas),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        telefono: true,
        email: true,
      },
    })
    return NextResponse.json({ cliente })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error"
    if (msg.includes("Unique constraint") && msg.includes("dni")) {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese DNI" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

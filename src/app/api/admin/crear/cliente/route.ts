import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body?.nombre || !body?.apellido) {
      return NextResponse.json(
        { error: "Nombre y apellido son obligatorios" },
        { status: 400 }
      )
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: String(body.nombre).trim(),
        apellido: String(body.apellido).trim(),
        dni: body.dni ? String(body.dni).replace(/\D/g, "") : null,
        cuit: body.cuit ? String(body.cuit).trim() : null,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        telefono: body.telefono ? String(body.telefono).trim() : null,
        telefonoAlt: body.telefonoAlt ? String(body.telefonoAlt).trim() : null,
        direccion: body.direccion ? String(body.direccion).trim() : null,
        ciudad: body.ciudad ? String(body.ciudad).trim() : null,
        provincia: body.provincia ? String(body.provincia).trim() : null,
        codigoPostal: body.codigoPostal ? String(body.codigoPostal).trim() : null,
        fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
        ocupacion: body.ocupacion ? String(body.ocupacion).trim() : null,
        notasInternas: body.notasInternas ? String(body.notasInternas).trim() : null,
      },
    })

    return NextResponse.json({ ok: true, id: cliente.id, cliente })
  } catch (e) {
    console.error("[admin/crear/cliente] Error:", e)
    const msg = e instanceof Error ? e.message : "Error al crear"
    if (msg.includes("Unique constraint") && msg.includes("dni")) {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese DNI" },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

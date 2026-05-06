import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { Prisma } from "@prisma/client"

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body?.nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      )
    }

    const contactos = Array.isArray(body.contactos) ? body.contactos : null
    const cuentasBancarias = Array.isArray(body.cuentasBancarias)
      ? body.cuentasBancarias
      : null
    const listaPrecios = Array.isArray(body.listaPrecios) ? body.listaPrecios : null

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: String(body.nombre).trim(),
        cuit: body.cuit ? String(body.cuit).trim() : null,
        email: body.email ? String(body.email).trim() : null,
        rubro: body.rubro ? String(body.rubro).trim() : null,
        sitio: body.sitio ? String(body.sitio).trim() : null,
        direccion: body.direccion ? String(body.direccion).trim() : null,
        ciudad: body.ciudad ? String(body.ciudad).trim() : null,
        notas: body.notas ? String(body.notas).trim() : null,
        activo: body.activo !== false,
        contactos: contactos
          ? (contactos as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        cuentasBancarias: cuentasBancarias
          ? (cuentasBancarias as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        listaPrecios: listaPrecios
          ? (listaPrecios as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })

    return NextResponse.json({ ok: true, id: proveedor.id, proveedor })
  } catch (e) {
    console.error("[admin/crear/proveedor] Error:", e)
    const msg = e instanceof Error ? e.message : "Error al crear"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const actual = await prisma.qrShortlink.findUnique({ where: { id } })
    if (!actual) {
      return NextResponse.json({ error: "QR no encontrado" }, { status: 404 })
    }

    type Patch = {
      modeloId?: string | null
      urlCustom?: string | null
      descripcion?: string | null
      activo?: boolean
      codigo?: string
      protegido?: boolean
    }
    const data: Patch = {}

    // ¿Queda protegido después de este cambio? (permite desbloquear en la misma request)
    const quedaraProtegido =
      body.protegido !== undefined ? !!body.protegido : actual.protegido

    if (body.modeloId !== undefined) data.modeloId = body.modeloId || null
    if (body.urlCustom !== undefined) data.urlCustom = body.urlCustom || null
    if (body.descripcion !== undefined)
      data.descripcion = body.descripcion || null
    if (body.protegido !== undefined) data.protegido = !!body.protegido

    // Con el candado puesto: no se puede desactivar ni cambiar el código.
    if (body.activo !== undefined) {
      if (quedaraProtegido && actual.activo && body.activo === false) {
        return NextResponse.json(
          { error: "QR protegido: desbloquealo primero para poder desactivarlo." },
          { status: 423 }
        )
      }
      data.activo = !!body.activo
    }
    if (body.codigo !== undefined) {
      const codigo = String(body.codigo)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "")
      if (!codigo) {
        return NextResponse.json({ error: "Código inválido" }, { status: 400 })
      }
      if (quedaraProtegido && codigo !== actual.codigo) {
        return NextResponse.json(
          {
            error:
              "QR protegido: no se puede cambiar el código (rompería el QR impreso). Desbloquealo primero.",
          },
          { status: 423 }
        )
      }
      data.codigo = codigo
    }

    const link = await prisma.qrShortlink.update({ where: { id }, data })
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const actual = await prisma.qrShortlink.findUnique({ where: { id } })
    if (!actual) {
      return NextResponse.json({ error: "QR no encontrado" }, { status: 404 })
    }
    if (actual.protegido) {
      return NextResponse.json(
        {
          error:
            "QR protegido: no se puede eliminar. Desbloquealo primero desde el candado.",
        },
        { status: 423 }
      )
    }
    await prisma.qrShortlink.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

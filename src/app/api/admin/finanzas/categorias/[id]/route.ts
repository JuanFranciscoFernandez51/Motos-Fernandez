import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/** PATCH → renombrar / activar-desactivar / reordenar. Al renombrar, arrastra los movimientos. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await req.json()
    const actual = await prisma.categoriaFinanciera.findUnique({ where: { id } })
    if (!actual) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

    const data: Record<string, unknown> = {}
    let nuevoNombre: string | null = null
    if ("nombre" in b) {
      nuevoNombre = String(b.nombre || "").trim()
      if (!nuevoNombre) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 })
      data.nombre = nuevoNombre
    }
    if ("activa" in b) data.activa = !!b.activa
    if ("orden" in b) data.orden = Math.round(Number(b.orden))

    const cat = await prisma.categoriaFinanciera.update({ where: { id }, data })

    // Si cambió el nombre, arrastramos los movimientos que tenían la categoría vieja
    if (nuevoNombre && nuevoNombre !== actual.nombre) {
      await prisma.movimientoFinanciero.updateMany({
        where: { categoria: actual.nombre, tipo: actual.tipo as "INGRESO" | "GASTO" },
        data: { categoria: nuevoNombre },
      })
    }
    revalidatePath("/admin/finanzas")
    return NextResponse.json(cat)
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre y tipo" }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

/** DELETE → elimina la categoría de la lista. Los movimientos viejos conservan su nombre. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cat = await prisma.categoriaFinanciera.findUnique({ where: { id } })
    if (!cat) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

    const enUso = await prisma.movimientoFinanciero.count({
      where: { categoria: cat.nombre, tipo: cat.tipo as "INGRESO" | "GASTO" },
    })
    // Si está en uso, la desactivamos (no se pierde el historial). Si no, se borra.
    if (enUso > 0) {
      await prisma.categoriaFinanciera.update({ where: { id }, data: { activa: false } })
      revalidatePath("/admin/finanzas")
      return NextResponse.json({ ok: true, desactivada: true, enUso })
    }
    await prisma.categoriaFinanciera.delete({ where: { id } })
    revalidatePath("/admin/finanzas")
    return NextResponse.json({ ok: true, eliminada: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

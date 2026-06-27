import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/** GET → categorías ordenadas (?tipo=INGRESO|GASTO opcional). */
export async function GET(req: NextRequest) {
  const tipo = new URL(req.url).searchParams.get("tipo")
  const categorias = await prisma.categoriaFinanciera.findMany({
    where: tipo ? { tipo } : undefined,
    orderBy: [{ tipo: "asc" }, { orden: "asc" }],
  })
  return NextResponse.json(categorias)
}

/** POST → crea una categoría. Body: { nombre, tipo }. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const nombre = String(b.nombre || "").trim()
    const tipo = b.tipo === "GASTO" ? "GASTO" : "INGRESO"
    if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })

    const max = await prisma.categoriaFinanciera.aggregate({ where: { tipo }, _max: { orden: true } })
    const cat = await prisma.categoriaFinanciera.create({
      data: { nombre, tipo, orden: (max._max.orden ?? -1) + 1 },
    })
    revalidatePath("/admin/finanzas")
    return NextResponse.json(cat)
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una categoría con ese nombre y tipo" }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

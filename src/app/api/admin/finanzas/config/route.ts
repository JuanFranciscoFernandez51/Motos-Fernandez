import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function getConfig() {
  let c = await prisma.finanzasConfig.findFirst()
  if (!c) c = await prisma.finanzasConfig.create({ data: {} })
  return c
}

export async function GET() {
  return NextResponse.json(await getConfig())
}

/** PUT → actualiza parámetros (motos/mes, margen bruto) y markups del calculador. */
export async function PUT(req: NextRequest) {
  try {
    const b = await req.json()
    const c = await getConfig()
    const num = (v: unknown, fallback: number) => (v == null || v === "" || Number.isNaN(Number(v)) ? fallback : Number(v))

    const updated = await prisma.finanzasConfig.update({
      where: { id: c.id },
      data: {
        motosEstimadasMes: b.motosEstimadasMes != null ? Math.max(1, Math.round(num(b.motosEstimadasMes, c.motosEstimadasMes))) : undefined,
        margenBrutoMoto: b.margenBrutoMoto != null ? Math.round(num(b.margenBrutoMoto, c.margenBrutoMoto)) : undefined,
        markupIndumentaria: b.markupIndumentaria != null ? num(b.markupIndumentaria, c.markupIndumentaria) : undefined,
        markupCascos: b.markupCascos != null ? num(b.markupCascos, c.markupCascos) : undefined,
        markupRepuestos: b.markupRepuestos != null ? num(b.markupRepuestos, c.markupRepuestos) : undefined,
        markupAccesorios: b.markupAccesorios != null ? num(b.markupAccesorios, c.markupAccesorios) : undefined,
        ivaPorcentaje: b.ivaPorcentaje != null ? num(b.ivaPorcentaje, c.ivaPorcentaje) : undefined,
      },
    })
    revalidatePath("/admin/finanzas")
    return NextResponse.json(updated)
  } catch (err) {
    console.error("PUT config finanzas:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

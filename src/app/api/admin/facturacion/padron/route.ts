import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { consultarPadron } from "@/lib/afip/padron"

/** GET /api/admin/facturacion/padron?cuit=20XXXXXXXX9 */
export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cuit = new URL(request.url).searchParams.get("cuit") || ""
  if (!cuit.trim()) {
    return NextResponse.json({ ok: false, error: "Falta el CUIT" }, { status: 400 })
  }

  try {
    const datos = await consultarPadron(cuit)
    return NextResponse.json({ ok: true, ...datos })
  } catch (e) {
    // Devolvemos 200 con ok:false para que la UI muestre el mensaje sin romper.
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo consultar el padrón",
    })
  }
}

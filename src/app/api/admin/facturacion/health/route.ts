import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { feDummy, ultimoAutorizado } from "@/lib/afip/wsfe"
import { ARCA_PTO_VENTA } from "@/lib/afip/config"
import { CBTE } from "@/lib/afip/tipos"

/** GET /api/admin/facturacion/health — verifica conexión + próximos números. */
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const dummy = await feDummy()
    const [ultA, ultB] = await Promise.all([
      ultimoAutorizado(ARCA_PTO_VENTA, CBTE.FACTURA_A),
      ultimoAutorizado(ARCA_PTO_VENTA, CBTE.FACTURA_B),
    ])
    return NextResponse.json({
      ok: dummy.appServer === "OK" && dummy.authServer === "OK",
      servidores: dummy,
      puntoVenta: ARCA_PTO_VENTA,
      proximaFacturaA: ultA + 1,
      proximaFacturaB: ultB + 1,
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo conectar con ARCA",
    })
  }
}

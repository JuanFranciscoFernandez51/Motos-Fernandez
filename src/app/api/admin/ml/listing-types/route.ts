import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { mlGet } from "@/lib/ml/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Devuelve los listing_types válidos en MLA para una categoría.
 * Útil para diagnosticar errores tipo "listing_type.temporarily_unavailable"
 * o "Invalid listing_type for this category".
 *
 * GET /api/admin/ml/listing-types?category=MLA1763
 *   → lista de tipos válidos del sitio
 * GET /api/admin/ml/listing-types?listing=MLA12345
 *   → exposicion / costo de cada tipo si publicaras esa moto
 */
export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") || "MLA1763"
  const listingId = searchParams.get("listing")

  try {
    const tipos = await mlGet(`/sites/MLA/listing_types`)
    let exposiciones: unknown = null
    if (listingId) {
      exposiciones = await mlGet(
        `/sites/MLA/listing_exposures?category_id=${encodeURIComponent(category)}`
      ).catch(() => null)
    }
    return NextResponse.json({
      ok: true,
      site: "MLA",
      category,
      listingTypes: tipos,
      exposiciones,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    )
  }
}

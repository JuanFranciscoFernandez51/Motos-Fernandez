import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  invalidateModelos,
  invalidateProductos,
  invalidateCategorias,
  invalidateNoticias,
  invalidateTestimonios,
} from "@/lib/cached-queries"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * Limpia el cache de Next.js para los datos públicos.
 *
 * POST /api/admin/cache/revalidate
 *   body: { scope: "modelos" | "productos" | "noticias" | "testimonios" | "todo" }
 *
 * Útil cuando los datos en la base están bien pero la home/catalogo
 * sigue mostrando algo viejo (o vacío) por unstable_cache pegado.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const scope: string = body.scope || "todo"

  const limpiados: string[] = []

  if (scope === "modelos" || scope === "todo") {
    invalidateModelos()
    revalidatePath("/")
    revalidatePath("/catalogo")
    limpiados.push("modelos", "/", "/catalogo")
  }
  if (scope === "productos" || scope === "todo") {
    invalidateProductos()
    invalidateCategorias()
    revalidatePath("/tienda")
    limpiados.push("productos", "categorias", "/tienda")
  }
  if (scope === "noticias" || scope === "todo") {
    invalidateNoticias()
    revalidatePath("/noticias")
    limpiados.push("noticias", "/noticias")
  }
  if (scope === "testimonios" || scope === "todo") {
    invalidateTestimonios()
    limpiados.push("testimonios")
  }

  return NextResponse.json({ ok: true, limpiados })
}

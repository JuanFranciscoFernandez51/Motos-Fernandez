import { NextResponse } from "next/server"
import { buscarEnSitio, type SearchScope } from "@/lib/search"

export const dynamic = "force-dynamic"

const SCOPES: SearchScope[] = ["todo", "0km", "disponibles", "tienda"]

/** GET /api/search?q=...&scope=todo|0km|disponibles|tienda */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") || "").slice(0, 80)
  const scopeParam = searchParams.get("scope") || "todo"
  const scope = SCOPES.includes(scopeParam as SearchScope)
    ? (scopeParam as SearchScope)
    : "todo"

  if (q.trim().length < 2) return NextResponse.json({ resultados: [] })

  try {
    const resultados = await buscarEnSitio(q, scope)
    return NextResponse.json({ resultados })
  } catch {
    return NextResponse.json({ resultados: [] })
  }
}

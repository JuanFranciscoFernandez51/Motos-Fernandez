import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSection } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { invalidateModelos } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/admin/stock-motos/[id]
 *
 * Editor inline rápido desde /admin/stock-motos. Solo permite tocar los
 * campos administrativos puros (chasis, motor, patente, precio, moneda,
 * clienteEntregaId, marca, modelo, anio, kilometros). NO toca fotos,
 * descripción, categoría, SEO, fichaTecnica, ML, Meta, etc — eso sigue
 * editándose desde /admin/modelos/[id] (el form completo del catálogo).
 *
 * Acepta cualquier subset de los campos. Los que no llegan en el body
 * se dejan tal cual. Strings vacíos se interpretan como "limpiar el
 * campo" (null para los nullables).
 */
const CAMPOS_PERMITIDOS = [
  "marca",
  "nombre",
  "anio",
  "kilometros",
  "chasis",
  "motor",
  "patente",
  "precio",
  "moneda",
  "clienteEntregaId",
  "color",
] as const

type CampoPermitido = (typeof CAMPOS_PERMITIDOS)[number]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSection("STOCK_MOTOS")
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  // Filtramos solo los campos que permitimos editar desde stock motos.
  // El resto del body se ignora silenciosamente (defensa).
  const data: Record<string, unknown> = {}
  for (const k of CAMPOS_PERMITIDOS) {
    if (!(k in body)) continue
    const raw = body[k]
    if (raw === "" || raw === null || raw === undefined) {
      data[k] = null
      continue
    }
    if (k === "anio" || k === "kilometros" || k === "precio") {
      const n = parseInt(String(raw))
      data[k] = Number.isFinite(n) ? n : null
    } else if (k === "patente" || k === "chasis" || k === "motor") {
      data[k] = String(raw).trim().toUpperCase() || null
    } else if (k === "moneda") {
      data[k] = String(raw) === "USD" ? "USD" : "ARS"
    } else {
      data[k] = String(raw).trim() || null
    }
  }

  // Validaciones mínimas
  if ("marca" in data && !data.marca) {
    return NextResponse.json({ error: "La marca no puede quedar vacía" }, { status: 400 })
  }
  if ("nombre" in data && !data.nombre) {
    return NextResponse.json({ error: "El modelo no puede quedar vacío" }, { status: 400 })
  }

  try {
    const updated = await prisma.modelo.update({
      where: { id },
      data,
      select: {
        id: true,
        slug: true,
        codigo: true,
        marca: true,
        nombre: true,
        anio: true,
        kilometros: true,
        chasis: true,
        motor: true,
        patente: true,
        precio: true,
        moneda: true,
        clienteEntregaId: true,
      },
    })
    revalidatePath("/admin/stock-motos")
    revalidatePath("/admin/modelos")
    revalidatePath("/catalogo")
    invalidateModelos(updated.slug)
    return NextResponse.json({ ok: true, modelo: updated })
  } catch (e) {
    console.error("[stock-motos.PATCH] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar" },
      { status: 500 }
    )
  }
}

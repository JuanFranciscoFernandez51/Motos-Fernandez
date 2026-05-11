import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { invalidateModelos } from "@/lib/cached-queries"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Crea una moto rápidamente con campos mínimos. Usado desde el form de
 * OC cuando aparece una moto que no estaba cargada en el catálogo (ej:
 * moto que llega del proveedor justo cuando viene el cliente).
 *
 * La moto se crea SIEMPRE como inactiva — para que aparezca en la web
 * pública hay que entrar a /admin/modelos, ponerle foto + precio y
 * activarla.
 *
 * Body: { marca, nombre, condicion, anio, kilometros, precio, moneda,
 *         chasis, motor, patente }
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))

  const marca = String(body.marca || "").trim()
  const nombre = String(body.nombre || "").trim()
  if (!marca || !nombre) {
    return NextResponse.json(
      { error: "Marca y modelo son obligatorios" },
      { status: 400 }
    )
  }
  const condicion =
    body.condicion === "USADA" || body.condicion === "0KM"
      ? body.condicion
      : "0KM"
  const anio = body.anio ? parseInt(String(body.anio)) : null
  const kilometros = body.kilometros ? parseInt(String(body.kilometros)) : null
  const precio = body.precio ? parseInt(String(body.precio)) : null
  const moneda = body.moneda === "USD" ? "USD" : "ARS"
  const chasis = body.chasis ? String(body.chasis).trim() : null
  const motor = body.motor ? String(body.motor).trim() : null
  const patente = body.patente
    ? String(body.patente).trim().toUpperCase()
    : null

  // Slug auto-incremental tipo mf-0XXX, mismo formato que las permutas.
  const ultimosMF = await prisma.modelo.findMany({
    where: { slug: { startsWith: "mf-" } },
    select: { slug: true },
  })
  const numerosMF = ultimosMF
    .map((m) => {
      const match = m.slug.match(/^mf-(\d+)$/i)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => n > 0)
  const proximoMF = numerosMF.length > 0 ? Math.max(...numerosMF) + 1 : 1
  const slug = `mf-${String(proximoMF).padStart(4, "0")}`

  const placeholderFoto = "/images/logo-clasico.png"
  try {
    const m = await prisma.modelo.create({
      data: {
        nombre,
        slug,
        marca,
        condicion,
        anio,
        kilometros,
        chasis,
        motor,
        patente,
        precio,
        moneda,
        activo: false, // siempre inactiva al crearla rápido desde OC
        fotos: [placeholderFoto],
      },
      select: {
        id: true,
        slug: true,
        nombre: true,
        marca: true,
        anio: true,
        kilometros: true,
        condicion: true,
        chasis: true,
        motor: true,
        patente: true,
        precio: true,
        moneda: true,
        fotos: true,
        vendida: true,
      },
    })
    revalidatePath("/admin/modelos")
    invalidateModelos()
    return NextResponse.json({ ok: true, modelo: m })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear moto" },
      { status: 400 }
    )
  }
}

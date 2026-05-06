import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { invalidateModelos } from "@/lib/cached-queries"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body?.nombre || !body?.marca) {
      return NextResponse.json(
        { error: "Marca y nombre son obligatorios" },
        { status: 400 }
      )
    }

    const nombre = String(body.nombre).trim()
    const marca = String(body.marca).trim()
    // Generar slug único
    const baseSlug = slugify(`${marca}-${nombre}${body.anio ? `-${body.anio}` : ""}`)
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    const modelo = await prisma.modelo.create({
      data: {
        nombre,
        slug,
        marca,
        categoriaVehiculo: body.categoriaVehiculo || "MOTOCICLETA",
        condicion: body.condicion || "0KM",
        anio: body.anio ? parseInt(String(body.anio), 10) : null,
        kilometros: body.kilometros != null ? parseInt(String(body.kilometros), 10) : null,
        cilindrada: body.cilindrada ? String(body.cilindrada).trim() : null,
        observaciones: body.observaciones ? String(body.observaciones).trim() : null,
        precio: body.precio ? parseInt(String(body.precio), 10) : null,
        moneda: body.moneda || "ARS",
        descripcion: body.descripcion ? String(body.descripcion).trim() : null,
        chasis: body.chasis ? String(body.chasis).trim() : null,
        motor: body.motor ? String(body.motor).trim() : null,
        patente: body.patente ? String(body.patente).trim().toUpperCase() : null,
        proveedorId: body.proveedorId ? String(body.proveedorId) : null,
        // Por defecto inactivo: el usuario debe activarlo cuando suba fotos
        activo: body.activo === true,
        fotos:
          Array.isArray(body.fotos) && body.fotos.length > 0
            ? body.fotos
            : ["/images/logo-clasico.png"],
      },
    })

    invalidateModelos()
    return NextResponse.json({ ok: true, id: modelo.id, modelo })
  } catch (e) {
    console.error("[admin/crear/modelo] Error:", e)
    const msg = e instanceof Error ? e.message : "Error al crear"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

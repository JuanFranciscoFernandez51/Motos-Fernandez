import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { publicarMandatoEnCatalogoSiCorresponde } from "@/lib/mandato-helpers"

/**
 * POST /api/admin/crear/mandato
 * Confirmación de la propuesta del asistente IA (proponer_crear_mandato).
 *
 * Crea un MandatoVenta (consignación) buscando o creando el cliente dueño, y
 * lo publica en Stock/catálogo (sin fotos queda inactivo hasta que el admin las
 * suba). precioVenta = precio público; precioMinimo = piso interno.
 */
export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const b = await request.json()
    const nombre = String(b?.clienteNombre || "").trim()
    const apellido = String(b?.clienteApellido || "").trim()
    const marca = String(b?.marca || "").trim()
    const modelo = String(b?.modelo || "").trim()
    const precioVenta = Number(b?.precioVenta)

    if (!nombre || !apellido)
      return NextResponse.json({ error: "Falta el nombre/apellido del dueño" }, { status: 400 })
    if (!marca || !modelo)
      return NextResponse.json({ error: "Falta marca/modelo de la moto" }, { status: 400 })
    if (!Number.isFinite(precioVenta) || precioVenta <= 0)
      return NextResponse.json({ error: "Falta el precio de venta" }, { status: 400 })

    // Buscar o crear el cliente dueño (por DNI, o por nombre+apellido)
    const dni = b?.clienteDni ? String(b.clienteDni).replace(/\D/g, "") : null
    let cliente =
      (dni && (await prisma.cliente.findFirst({ where: { dni } }))) ||
      (await prisma.cliente.findFirst({
        where: {
          nombre: { equals: nombre, mode: "insensitive" },
          apellido: { equals: apellido, mode: "insensitive" },
        },
      }))
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre,
          apellido,
          dni,
          telefono: b?.clienteTelefono ? String(b.clienteTelefono).trim() : null,
        },
      })
    }

    const moneda = b?.moneda === "USD" ? "USD" : "ARS"
    const tipoTenencia = b?.tipoTenencia === "EN_DOMICILIO" ? "EN_DOMICILIO" : "EN_LOCAL"
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null)

    const out = await prisma.$transaction(async (tx) => {
      const mandato = await tx.mandatoVenta.create({
        data: {
          clienteId: cliente!.id,
          marca,
          modelo,
          anio: num(b?.anio),
          kilometros: num(b?.kilometros),
          cilindrada: b?.cilindrada ? String(b.cilindrada).trim() : null,
          color: b?.color ? String(b.color).trim() : null,
          chasis: b?.chasis ? String(b.chasis).trim() : null,
          motor: b?.motor ? String(b.motor).trim() : null,
          patente: b?.patente ? String(b.patente).trim() : null,
          precioVenta: Math.round(precioVenta),
          precioMinimo: num(b?.precioMinimo),
          moneda,
          tipoTenencia,
          estado: "ACTIVO",
          observaciones: b?.observaciones ? String(b.observaciones).trim() : null,
          fotos: [],
        },
      })
      const pub = await publicarMandatoEnCatalogoSiCorresponde(tx, mandato.id)
      return { mandato, pub }
    })

    return NextResponse.json({
      ok: true,
      id: out.mandato.id,
      numero: out.mandato.numero,
      mensaje: `Mandato MV-${out.mandato.numero} creado. La moto entró a Stock (cargá fotos para publicarla en el catálogo).`,
    })
  } catch (e) {
    console.error("[admin/crear/mandato] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear el mandato" },
      { status: 500 }
    )
  }
}

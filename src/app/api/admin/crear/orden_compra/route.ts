import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

/**
 * POST /api/admin/crear/orden_compra
 * Confirmación de la propuesta del asistente IA (proponer_crear_orden_compra).
 *
 * Crea una OrdenCompra BASE (cliente comprador + moto vendida + precio +
 * financiación) en estado BORRADOR. Las permutas (parte de pago) y los pagos
 * parciales se agregan después en la página de la OC, donde está la lógica
 * probada (incl. el valor de toma separado del precio de publicación).
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
    const motoDescripcion = String(b?.motoDescripcion || "").trim()
    const precioVenta = Number(b?.precioVenta)

    if (!nombre || !apellido)
      return NextResponse.json({ error: "Falta el nombre/apellido del comprador" }, { status: 400 })
    if (!motoDescripcion)
      return NextResponse.json({ error: "Falta la descripción de la moto vendida" }, { status: 400 })
    if (!Number.isFinite(precioVenta) || precioVenta <= 0)
      return NextResponse.json({ error: "Falta el precio de venta" }, { status: 400 })

    // Buscar o crear el cliente comprador (por DNI, o por nombre+apellido)
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
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null)

    const oc = await prisma.ordenCompra.create({
      data: {
        clienteId: cliente.id,
        motoDescripcion,
        motoChasis: b?.motoChasis ? String(b.motoChasis).trim() : null,
        motoMotor: b?.motoMotor ? String(b.motoMotor).trim() : null,
        motoPatente: b?.motoPatente ? String(b.motoPatente).trim() : null,
        motoAnio: num(b?.motoAnio),
        motoKilometros: num(b?.motoKilometros),
        precioVenta: Math.round(precioVenta),
        moneda,
        cuotas: num(b?.cuotas),
        valorCuota: num(b?.valorCuota),
        estado: "BORRADOR",
        observaciones: b?.observaciones ? String(b.observaciones).trim() : null,
      },
    })

    return NextResponse.json({
      ok: true,
      id: oc.id,
      numero: oc.numero,
      mensaje: `Orden de compra OC-${oc.numero} creada (borrador). Agregá permutas/pagos en la página de la OC.`,
    })
  } catch (e) {
    console.error("[admin/crear/orden_compra] Error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear la orden de compra" },
      { status: 500 }
    )
  }
}

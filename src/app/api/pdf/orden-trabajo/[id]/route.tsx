import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { OrdenTrabajoPDF } from "@/lib/pdf/orden-trabajo-pdf"
import { NEGOCIO } from "@/lib/pdf/negocio-config"

export const dynamic = "force-dynamic"

type OTItemRaw = {
  descripcion?: string
  tipo?: string
  cantidad?: number | string
  precio?: number | string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      cliente: true,
      tipoServicio: true,
    },
  })

  if (!ot) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const rawItems = (ot.items as OTItemRaw[] | null) ?? []
  const items = rawItems.map((it) => ({
    descripcion: String(it.descripcion || ""),
    tipo: String(it.tipo || "repuesto"),
    cantidad: it.cantidad ?? 1,
    precio: it.precio ?? 0,
  }))

  const pdfBuffer = await renderToBuffer(
    <OrdenTrabajoPDF
      data={{
        numero: ot.numero,
        fecha: ot.fechaIngreso,
        fechaPrometida: ot.fechaPrometida,
        estado: ot.estado,
        cliente: {
          nombre: ot.cliente.nombre,
          apellido: ot.cliente.apellido,
          dni: ot.cliente.dni,
          telefono: ot.cliente.telefono,
          direccion: ot.cliente.direccion,
          ciudad: ot.cliente.ciudad,
        },
        moto: {
          marca: ot.motoMarca,
          modelo: ot.motoModelo,
          anio: ot.motoAnio,
          patente: ot.motoPatente,
          kilometros: ot.motoKilometros,
        },
        servicio: {
          tipo: ot.tipoServicio?.nombre,
          motivoIngreso: ot.motivoIngreso,
          diagnostico: ot.diagnostico,
          trabajosRealizados: ot.trabajosRealizados,
        },
        items,
        economico: {
          subtotal: ot.subtotal,
          descuento: ot.descuento,
          total: ot.total,
          pagado: ot.pagado,
          saldo: ot.saldo,
        },
        observaciones: ot.observaciones,
        negocio: NEGOCIO,
      }}
    />
  )

  const numeroFormateado = `OT-${String(ot.numero).padStart(4, "0")}`
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="OT-${numeroFormateado}.pdf"`,
    },
  })
}

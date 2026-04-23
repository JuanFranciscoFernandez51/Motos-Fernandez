import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { MandatoPDF } from "@/lib/pdf/mandato-pdf"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const mandato = await prisma.mandatoVenta.findUnique({
    where: { id },
    include: { cliente: true },
  })

  if (!mandato) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const negocio = await getNegocioConfig()

  const pdfBuffer = await renderToBuffer(
    <MandatoPDF
      data={{
        numero: mandato.numero,
        fecha: mandato.fechaFirma ?? mandato.createdAt,
        fechaVencimiento: mandato.fechaVencimiento,
        cliente: {
          nombre: mandato.cliente.nombre,
          apellido: mandato.cliente.apellido,
          dni: mandato.cliente.dni,
          cuit: mandato.cliente.cuit,
          direccion: mandato.cliente.direccion,
          ciudad: mandato.cliente.ciudad,
          provincia: mandato.cliente.provincia,
          telefono: mandato.cliente.telefono,
          email: mandato.cliente.email,
        },
        moto: {
          marca: mandato.marca,
          modelo: mandato.modelo,
          anio: mandato.anio,
          kilometros: mandato.kilometros,
          cilindrada: mandato.cilindrada,
          color: mandato.color,
          chasis: mandato.chasis,
          motor: mandato.motor,
          patente: mandato.patente,
        },
        documentacion: {
          tieneTitulo: mandato.tieneTitulo,
          tituloANombreCliente: mandato.tituloANombreCliente,
          tienePrenda: mandato.tienePrenda,
          detallePrenda: mandato.detallePrenda,
          verificacionTecnica: mandato.verificacionTecnica,
        },
        economico: {
          precioVenta: mandato.precioVenta,
          precioMinimo: mandato.precioMinimo,
          comisionPorc: mandato.comisionPorc,
          comisionMonto: mandato.comisionMonto,
          moneda: mandato.moneda,
        },
        observaciones: mandato.observaciones,
        negocio,
      }}
    />
  )

  const numeroFormateado = `MV-${String(mandato.numero).padStart(4, "0")}`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Mandato-${numeroFormateado}.pdf"`,
    },
  })
}

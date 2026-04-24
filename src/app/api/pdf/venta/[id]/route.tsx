import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { VentaPDF } from "@/lib/pdf/venta-pdf"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"
import { getLogoBuffer } from "@/lib/pdf/logo-loader"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const venta = await prisma.ventaMoto.findUnique({
    where: { id },
    include: { cliente: true },
  })
  if (!venta) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const negocio = await getNegocioConfig()

  const pdfBuffer = await renderToBuffer(
    <VentaPDF
      data={{
        logoSrc: getLogoBuffer(),
        numero: venta.numero,
        fecha: venta.fecha,
        cliente: {
          nombre: venta.cliente.nombre,
          apellido: venta.cliente.apellido,
          dni: venta.cliente.dni,
          cuit: venta.cliente.cuit,
          direccion: venta.cliente.direccion,
          ciudad: venta.cliente.ciudad,
          telefono: venta.cliente.telefono,
          email: venta.cliente.email,
        },
        moto: {
          descripcion: venta.motoDescripcion,
          chasis: venta.motoChasis,
          motor: venta.motoMotor,
          patente: venta.motoPatente,
          anio: venta.motoAnio,
          kilometros: venta.motoKilometros,
        },
        economico: {
          precioVenta: venta.precioVenta,
          moneda: venta.moneda,
          formaPago: venta.formaPago,
          sena: venta.sena,
          saldo: venta.saldo,
          detallePago: venta.detallePago,
          permutaDescripcion: venta.permutaDescripcion,
          permutaValor: venta.permutaValor,
          cuotas: venta.cuotas,
          valorCuota: venta.valorCuota,
          entrega: venta.entrega,
        },
        observaciones: venta.observaciones,
        negocio,
      }}
    />
  )

  const numeroFormateado = `V-${String(venta.numero).padStart(4, "0")}`
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Boleto-${numeroFormateado}.pdf"`,
    },
  })
}

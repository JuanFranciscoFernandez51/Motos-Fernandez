import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { OCPDF } from "@/lib/pdf/oc-pdf"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"
import { getLogoBuffer } from "@/lib/pdf/logo-loader"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orden = await prisma.ordenCompra.findUnique({
    where: { id },
    include: {
      cliente: true,
      pagos: { orderBy: { createdAt: "asc" } },
      permutas: { orderBy: { createdAt: "asc" } },
      financiacion: true,
    },
  })
  if (!orden) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const negocio = await getNegocioConfig()

  // Datos del garante: viene de la financiación asociada (si hay).
  const garante = orden.financiacion
    ? {
        nombre: orden.financiacion.garanteNombre,
        apellido: orden.financiacion.garanteApellido,
        dni: orden.financiacion.garanteDni,
        telefono: orden.financiacion.garanteTelefono,
        direccion: orden.financiacion.garanteDireccion,
      }
    : null

  const pdfBuffer = await renderToBuffer(
    <OCPDF
      data={{
        logoSrc: getLogoBuffer(),
        numero: orden.numero,
        fecha: orden.fecha,
        cliente: {
          nombre: orden.cliente.nombre,
          apellido: orden.cliente.apellido,
          dni: orden.cliente.dni,
          cuit: orden.cliente.cuit,
          direccion: orden.cliente.direccion,
          ciudad: orden.cliente.ciudad,
          telefono: orden.cliente.telefono,
          email: orden.cliente.email,
        },
        moto: {
          descripcion: orden.motoDescripcion,
          chasis: orden.motoChasis,
          motor: orden.motoMotor,
          patente: orden.motoPatente,
          anio: orden.motoAnio,
          kilometros: orden.motoKilometros,
        },
        economico: {
          precioVenta: orden.precioVenta,
          moneda: orden.moneda,
          formaPago: orden.formaPago,
          sena: orden.sena,
          saldo: orden.saldo,
          detallePago: orden.detallePago,
          cuotas: orden.cuotas,
          valorCuota: orden.valorCuota,
          entrega: orden.entrega,
        },
        pagos: orden.pagos.map((p) => ({
          metodo: p.metodo,
          monto: p.monto,
          detalle: p.detalle,
          fecha: p.fecha,
        })),
        permutas: orden.permutas.map((p) => ({
          marca: p.marca,
          modelo: p.modelo,
          anio: p.anio,
          kilometros: p.kilometros,
          patente: p.patente,
          chasis: p.chasis,
          motor: p.motor,
          descripcion: p.descripcion,
          valor: p.valor,
        })),
        garante,
        observaciones: orden.observaciones,
        negocio,
      }}
    />
  )

  const numeroFormateado = `OC-${String(orden.numero).padStart(4, "0")}`
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Boleto-${numeroFormateado}.pdf"`,
    },
  })
}

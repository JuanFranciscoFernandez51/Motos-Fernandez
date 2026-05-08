import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { PresupuestoPDF } from "@/lib/pdf/presupuesto-pdf"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"
import { getLogoBuffer } from "@/lib/pdf/logo-loader"

export const dynamic = "force-dynamic"

type ItemRaw = {
  descripcion?: string
  tipo?: string
  cantidad?: number | string
  precio?: number | string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const dispositionMode = url.searchParams.get("inline") === "1" ? "inline" : "attachment"

  const pre = await prisma.presupuesto.findUnique({
    where: { id },
    include: { cliente: true },
  })

  if (!pre) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }

  const negocio = await getNegocioConfig()

  const rawItems = (pre.items as ItemRaw[] | null) ?? []
  const items = rawItems.map((it) => ({
    descripcion: String(it.descripcion || ""),
    tipo: String(it.tipo || "repuesto"),
    cantidad: it.cantidad ?? 1,
    precio: it.precio ?? 0,
  }))

  const fechaVencimiento = new Date(pre.fecha)
  fechaVencimiento.setDate(fechaVencimiento.getDate() + pre.validezDias)

  const pdfBuffer = await renderToBuffer(
    <PresupuestoPDF
      data={{
        logoSrc: getLogoBuffer(),
        numero: pre.numero,
        fecha: pre.fecha,
        validezDias: pre.validezDias,
        fechaVencimiento,
        cliente: {
          nombre: pre.cliente?.nombre ?? null,
          apellido: pre.cliente?.apellido ?? null,
          dni: pre.cliente?.dni ?? null,
          telefono: pre.cliente?.telefono ?? pre.clienteContacto ?? null,
          contacto: pre.clienteNombre,
        },
        moto: {
          marca: pre.motoMarca,
          modelo: pre.motoModelo,
          anio: pre.motoAnio,
          patente: pre.motoPatente,
          kilometros: pre.motoKilometros,
        },
        motivoIngreso: pre.motivoIngreso,
        trabajosACotizar: pre.trabajosACotizar,
        items,
        economico: {
          subtotal: pre.subtotal,
          descuento: pre.descuento,
          total: pre.total,
        },
        observaciones: pre.observaciones,
        negocio,
      }}
    />
  )

  const numeroFormateado = `PRE-${String(pre.numero).padStart(4, "0")}`
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${dispositionMode}; filename="${numeroFormateado}.pdf"`,
    },
  })
}

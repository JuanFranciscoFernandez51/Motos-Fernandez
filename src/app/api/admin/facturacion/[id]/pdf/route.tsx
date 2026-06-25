import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { getNegocioConfig } from "@/lib/pdf/negocio-config"
import { getLogoBuffer } from "@/lib/pdf/logo-loader"
import { FacturaPDF } from "@/lib/pdf/factura-pdf"
import { generarQrAfip } from "@/lib/afip/qr"
import { ARCA_CUIT } from "@/lib/afip/config"
import { letraCbte, labelCbte, labelCondIva, IVA_PCT, DOC } from "@/lib/afip/tipos"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const f = await prisma.factura.findUnique({ where: { id } })
  if (!f) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  if (f.estado !== "EMITIDA" || !f.cae || f.numero == null) {
    return NextResponse.json(
      { error: "La factura no está emitida (sin CAE)" },
      { status: 400 }
    )
  }

  const negocio = await getNegocioConfig()
  const letra = letraCbte(f.tipoCbte)
  const esA = letra === "A"

  // Items guardados: [{ descripcion, cantidad, precioUnit (final c/IVA), alicuotaIva }]
  const itemsRaw = (f.items as unknown as {
    descripcion: string
    cantidad: number
    precioUnit: number
    alicuotaIva: number
  }[]) || []

  const items = itemsRaw.map((it) => {
    const pct = IVA_PCT[it.alicuotaIva] ?? 0
    const brutoUnit = it.precioUnit
    const netoUnit = pct > 0 ? brutoUnit / (1 + pct / 100) : brutoUnit
    // En Factura A se muestran valores netos; en B, finales con IVA.
    const unit = esA ? netoUnit : brutoUnit
    return {
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precioUnit: unit,
      subtotal: unit * it.cantidad,
      alicuota: `${pct}%`.replace(".", ","),
    }
  })

  const qrDataUrl = await generarQrAfip({
    fecha: f.fechaCbte,
    ptoVta: f.puntoVenta,
    tipoCmp: f.tipoCbte,
    nroCmp: f.numero,
    importe: f.impTotal,
    docTipoRec: f.docTipo,
    docNroRec: f.docNro,
    cae: f.cae,
  })

  const docLabel = f.docTipo === DOC.CUIT ? "CUIT" : f.docTipo === DOC.CUIL ? "CUIL" : "DNI"
  const cuitEmisor = negocio.cuit && negocio.cuit !== "—" ? negocio.cuit : ARCA_CUIT

  const pdf = await renderToBuffer(
    <FacturaPDF
      data={{
        letra,
        codigoCbte: f.tipoCbte,
        tituloCbte: labelCbte(f.tipoCbte),
        ptoVta: f.puntoVenta,
        numero: f.numero,
        fecha: f.fechaCbte,
        logoSrc: getLogoBuffer(),
        emisor: {
          razonSocial: negocio.razonSocial,
          domicilio: `${negocio.direccion} — ${negocio.ciudad}`,
          cuit: cuitEmisor,
          iva: negocio.iva,
          ingresosBrutos: negocio.ingresosBrutos,
          inicioActividades: negocio.inicioActividades,
          telefono: negocio.telefono,
          email: negocio.email,
          web: negocio.web,
        },
        receptor: {
          nombre: f.receptorNombre,
          docLabel,
          docNro: f.docNro,
          domicilio: f.receptorDomicilio,
          condIva: f.condIvaReceptorId ? labelCondIva(f.condIvaReceptorId) : "",
        },
        items,
        impNeto: f.impNeto,
        impIva: f.impIva,
        impTotal: f.impTotal,
        cae: f.cae,
        caeVto: f.caeVto,
        qrDataUrl,
      }}
    />
  )

  const nombreArchivo = `Factura-${letra}-${String(f.puntoVenta).padStart(4, "0")}-${String(
    f.numero
  ).padStart(8, "0")}.pdf`
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
    },
  })
}

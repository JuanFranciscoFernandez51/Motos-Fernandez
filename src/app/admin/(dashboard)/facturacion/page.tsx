import { prisma } from "@/lib/prisma"
import { FacturacionClient } from "./facturacion-client"

export const dynamic = "force-dynamic"

export default async function FacturacionPage() {
  const facturas = await prisma.factura.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { cliente: { select: { nombre: true, apellido: true } } },
  })

  return (
    <FacturacionClient
      facturas={facturas.map((f) => ({
        id: f.id,
        puntoVenta: f.puntoVenta,
        tipoCbte: f.tipoCbte,
        numero: f.numero,
        fechaCbte: f.fechaCbte.toISOString(),
        receptorNombre: f.receptorNombre,
        docNro: f.docNro,
        impTotal: f.impTotal,
        estado: f.estado,
        cae: f.cae,
        caeVto: f.caeVto ? f.caeVto.toISOString() : null,
      }))}
    />
  )
}

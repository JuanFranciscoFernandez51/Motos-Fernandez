import { prisma } from "@/lib/prisma"
import { asegurarVencimientos } from "@/lib/contador-helpers"
import { ContadorClient } from "./contador-client"

export const dynamic = "force-dynamic"

export default async function ContadorPage() {
  // Genera los vencimientos de las obligaciones activas (idempotente).
  await asegurarVencimientos(3)

  const desde = new Date()
  desde.setDate(1)
  desde.setHours(0, 0, 0, 0)

  const [vencimientos, obligaciones] = await Promise.all([
    prisma.vencimiento.findMany({
      where: {
        OR: [{ estado: "PENDIENTE" }, { fechaVencimiento: { gte: desde } }],
      },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.obligacionFiscal.findMany({ orderBy: { titulo: "asc" } }),
  ])

  return (
    <ContadorClient
      vencimientos={vencimientos.map((v) => ({
        id: v.id,
        tipo: v.tipo,
        titulo: v.titulo,
        periodo: v.periodo,
        fechaVencimiento: v.fechaVencimiento.toISOString(),
        monto: v.monto,
        estado: v.estado,
        pagadoEl: v.pagadoEl ? v.pagadoEl.toISOString() : null,
        comprobanteUrl: v.comprobanteUrl,
        notas: v.notas,
      }))}
      obligaciones={obligaciones.map((o) => ({
        id: o.id,
        tipo: o.tipo,
        titulo: o.titulo,
        diaVencimiento: o.diaVencimiento,
        montoEstimado: o.montoEstimado,
        activo: o.activo,
      }))}
    />
  )
}

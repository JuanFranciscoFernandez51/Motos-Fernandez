import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "../finanzas-nav"
import { CuentasChequesClient } from "./cuentas-cheques-client"

export const dynamic = "force-dynamic"

export default async function CuentasChequesPage() {
  const [cxc, cheques, cuentas] = await Promise.all([
    prisma.cuentaPorCobrar.findMany({
      orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }, { createdAt: "desc" }],
    }),
    prisma.cheque.findMany({
      orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }],
    }),
    prisma.cuentaFinanciera.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }],
      select: { id: true, nombre: true, moneda: true },
    }),
  ])

  const ser = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzas</h1>
      <FinanzasNav />
      <CuentasChequesClient
        cuentas={cuentas}
        cxc={cxc.map((c) => ({
          id: c.id,
          sentido: c.sentido,
          cliente: c.cliente,
          tipo: c.tipo,
          descripcion: c.descripcion,
          monto: c.monto,
          moneda: c.moneda,
          fechaVencimiento: ser(c.fechaVencimiento),
          estado: c.estado,
        }))}
        cheques={cheques.map((c) => ({
          id: c.id,
          tipo: c.tipo,
          beneficiario: c.beneficiario,
          monto: c.monto,
          moneda: c.moneda,
          formato: c.formato,
          fechaVencimiento: ser(c.fechaVencimiento)!,
          estado: c.estado,
        }))}
      />
    </div>
  )
}

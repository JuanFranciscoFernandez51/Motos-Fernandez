import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "../finanzas-nav"
import { CostosClient } from "./costos-client"

export const dynamic = "force-dynamic"

export default async function CostosPage() {
  const [costos, config] = await Promise.all([
    prisma.costoFijo.findMany({ orderBy: [{ activo: "desc" }, { orden: "asc" }] }),
    prisma.finanzasConfig.findUnique({ where: { id: "singleton" } }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzas</h1>
      <FinanzasNav />
      <CostosClient
        costos={costos.map((c) => ({ id: c.id, concepto: c.concepto, monto: c.monto, activo: c.activo }))}
        config={{
          ventasEstimadasMes: config?.ventasEstimadasMes ?? 0,
          margenBrutoVenta: config?.margenBrutoVenta ?? 0,
        }}
      />
    </div>
  )
}

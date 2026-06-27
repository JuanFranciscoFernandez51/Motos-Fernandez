import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { CostosFijosCliente } from "@/components/admin/finanzas/costos-fijos-cliente"

export const dynamic = "force-dynamic"

export default async function CostosFijosPage() {
  let config = await prisma.finanzasConfig.findFirst()
  if (!config) config = await prisma.finanzasConfig.create({ data: {} })
  const costos = await prisma.costoFijo.findMany({ orderBy: { orden: "asc" } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Costos fijos mensuales y cuántas motos necesitás para cubrirlos.</p>
      </div>
      <FinanzasNav />
      <CostosFijosCliente
        costos={JSON.parse(JSON.stringify(costos))}
        config={JSON.parse(JSON.stringify(config))}
      />
    </div>
  )
}

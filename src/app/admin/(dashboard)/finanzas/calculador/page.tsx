import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { CalculadorCliente } from "@/components/admin/finanzas/calculador-cliente"

export const dynamic = "force-dynamic"

export default async function CalculadorPage() {
  let config = await prisma.finanzasConfig.findFirst()
  if (!config) config = await prisma.finanzasConfig.create({ data: {} })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Calculá el precio de venta sugerido a partir del costo y el markup por categoría.</p>
      </div>
      <FinanzasNav />
      <CalculadorCliente config={JSON.parse(JSON.stringify(config))} />
    </div>
  )
}

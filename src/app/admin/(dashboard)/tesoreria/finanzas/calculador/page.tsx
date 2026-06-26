import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "../finanzas-nav"
import { CalculadorClient } from "./calculador-client"

export const dynamic = "force-dynamic"

export default async function CalculadorPage() {
  const config = await prisma.finanzasConfig.findUnique({ where: { id: "singleton" } })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzas</h1>
      <FinanzasNav />
      <CalculadorClient
        config={{
          ivaPorcentaje: config?.ivaPorcentaje ?? 21,
          markupRepuestos: config?.markupRepuestos ?? 0.4,
          markupAccesorios: config?.markupAccesorios ?? 0.45,
          markupServicio: config?.markupServicio ?? 0.5,
        }}
      />
    </div>
  )
}

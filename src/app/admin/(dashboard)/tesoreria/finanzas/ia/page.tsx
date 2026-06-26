import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "../finanzas-nav"
import { IAClient } from "./ia-client"

export const dynamic = "force-dynamic"

export default async function IAPage() {
  const [cuentas, categorias] = await Promise.all([
    prisma.cuentaFinanciera.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }],
      select: { id: true, nombre: true },
    }),
    prisma.categoriaFinanciera.findMany({
      where: { activa: true },
      orderBy: [{ tipo: "asc" }, { orden: "asc" }],
      select: { nombre: true, tipo: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzas</h1>
      <FinanzasNav />
      <IAClient cuentas={cuentas} categorias={categorias} />
    </div>
  )
}

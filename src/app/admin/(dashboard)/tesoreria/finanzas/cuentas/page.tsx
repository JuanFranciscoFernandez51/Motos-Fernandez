import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "../finanzas-nav"
import { CuentasClient } from "./cuentas-client"

export const dynamic = "force-dynamic"

export default async function CuentasPage() {
  const [cuentas, categorias] = await Promise.all([
    prisma.cuentaFinanciera.findMany({
      orderBy: [{ activa: "desc" }, { orden: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { movimientos: true } } },
    }),
    prisma.categoriaFinanciera.findMany({ orderBy: [{ tipo: "asc" }, { orden: "asc" }] }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finanzas</h1>
      <FinanzasNav />
      <CuentasClient
        cuentas={cuentas.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          moneda: c.moneda,
          saldoInicial: c.saldoInicial,
          excluirDeResultado: c.excluirDeResultado,
          activa: c.activa,
          movimientos: c._count.movimientos,
        }))}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo }))}
      />
    </div>
  )
}

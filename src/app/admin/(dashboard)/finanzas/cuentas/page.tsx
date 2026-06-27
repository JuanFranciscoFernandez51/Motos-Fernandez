import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { CuentasCliente } from "@/components/admin/finanzas/cuentas-cliente"
import { CategoriasManager } from "@/components/admin/finanzas/categorias-manager"
import { calcularSaldos } from "@/lib/finanzas"

export const dynamic = "force-dynamic"

export default async function CuentasPage() {
  const [cuentas, movimientos, categorias] = await Promise.all([
    prisma.cuentaFinanciera.findMany({ orderBy: { orden: "asc" } }),
    prisma.movimientoFinanciero.findMany({ select: { cuentaId: true, tipo: true, monto: true } }),
    prisma.categoriaFinanciera.findMany({ orderBy: [{ tipo: "asc" }, { orden: "asc" }] }),
  ])
  const saldos = calcularSaldos(cuentas, movimientos)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Cuentas, saldos y categorías. Editá el saldo inicial de cada cuenta.</p>
      </div>
      <FinanzasNav />
      <CuentasCliente
        cuentas={JSON.parse(JSON.stringify(cuentas))}
        saldos={JSON.parse(JSON.stringify(saldos.map((s) => ({ id: s.cuenta.id, movimientoNeto: s.movimientoNeto, saldoActual: s.saldoActual }))))}
      />
      <CategoriasManager categorias={JSON.parse(JSON.stringify(categorias))} />
    </div>
  )
}

import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { CuentasYChequesCliente } from "@/components/admin/finanzas/cuentas-y-cheques-cliente"

export const dynamic = "force-dynamic"

export default async function CuentasYChequesPage() {
  const [cuentas, cheques, cuentasFinancieras] = await Promise.all([
    prisma.cuentaPorCobrar.findMany({
      orderBy: [{ estado: "asc" }, { fechaVencimiento: "asc" }, { createdAt: "desc" }],
    }),
    prisma.cheque.findMany({ orderBy: { fechaVencimiento: "asc" } }),
    prisma.cuentaFinanciera.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ])

  const cobros = cuentas.filter((c) => c.sentido === "COBRAR")
  const pagos = cuentas.filter((c) => c.sentido === "PAGAR")

  // Resumen (solo ARS pendiente): cuentas + cheques
  const sumPend = (arr: { monto: number; moneda: string; estado: string }[]) =>
    arr.filter((x) => x.estado === "PENDIENTE" && x.moneda === "ARS").reduce((a, x) => a + x.monto, 0)
  const chequesCobrar = cheques.filter((c) => c.tipo === "A_COBRAR")
  const chequesPagar = cheques.filter((c) => c.tipo === "A_PAGAR")

  const totalCobrar = sumPend(cobros) + sumPend(chequesCobrar)
  const totalPagar = sumPend(pagos) + sumPend(chequesPagar)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Cuentas a cobrar, cuentas a pagar y cheques — en un solo lugar.</p>
      </div>
      <FinanzasNav />
      <CuentasYChequesCliente
        cobros={JSON.parse(JSON.stringify(cobros))}
        pagos={JSON.parse(JSON.stringify(pagos))}
        cheques={JSON.parse(JSON.stringify(cheques))}
        cuentasFinancieras={JSON.parse(JSON.stringify(cuentasFinancieras))}
        totalCobrar={totalCobrar}
        totalPagar={totalPagar}
      />
    </div>
  )
}

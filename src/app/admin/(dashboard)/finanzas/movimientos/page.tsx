import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { MovimientosCliente } from "@/components/admin/finanzas/movimientos-cliente"
import { getCategorias } from "@/lib/finanzas-data"

export const dynamic = "force-dynamic"

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>
}) {
  const sp = await searchParams
  const anio = Number(sp.anio) || new Date().getFullYear()

  const [cuentas, movimientos, categorias] = await Promise.all([
    prisma.cuentaFinanciera.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } },
      include: { cuenta: true },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    }),
    getCategorias(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
        <p className="text-sm text-gray-500">Cargá y revisá todos los movimientos del negocio.</p>
      </div>
      <FinanzasNav />
      <MovimientosCliente
        cuentas={cuentas}
        movimientos={JSON.parse(JSON.stringify(movimientos))}
        anio={anio}
        categorias={categorias}
      />
    </div>
  )
}

import { prisma } from "@/lib/prisma"
import { getMovimientos } from "@/lib/finanzas-data"
import { FinanzasNav } from "../finanzas-nav"
import { MovimientosClient } from "./movimientos-client"

export const dynamic = "force-dynamic"

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; cuenta?: string; tipo?: string; q?: string }>
}) {
  const sp = await searchParams
  // mes en formato yyyy-mm; default mes actual (AR)
  const ar = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const mesStr = sp.mes || `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, "0")}`
  const [anio, mes] = mesStr.split("-").map((n) => parseInt(n, 10))

  const [cuentas, categorias, movs] = await Promise.all([
    prisma.cuentaFinanciera.findMany({
      where: { activa: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, moneda: true },
    }),
    prisma.categoriaFinanciera.findMany({
      where: { activa: true },
      orderBy: [{ tipo: "asc" }, { orden: "asc" }],
      select: { nombre: true, tipo: true },
    }),
    getMovimientos({ anio, mes, cuentaId: sp.cuenta, tipo: sp.tipo, q: sp.q }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
      </div>
      <FinanzasNav />
      <MovimientosClient
        mes={mesStr}
        filtros={{ cuenta: sp.cuenta || "", tipo: sp.tipo || "", q: sp.q || "" }}
        cuentas={cuentas}
        categorias={categorias}
        movimientos={movs.map((m) => ({
          id: m.id,
          fecha: m.fecha.toISOString().slice(0, 10),
          tipo: m.tipo,
          categoria: m.categoria,
          descripcion: m.descripcion,
          monto: m.monto,
          moneda: m.moneda,
          registrado: m.registrado,
          cuentaId: m.cuentaId,
          cuentaNombre: m.cuenta.nombre,
          esTransfer: m.tipo === "TRANSFERENCIA" || !!m.transferenciaId,
        }))}
      />
    </div>
  )
}

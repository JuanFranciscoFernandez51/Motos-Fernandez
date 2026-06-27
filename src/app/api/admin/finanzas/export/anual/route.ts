import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"
import { calcularDashboardAnual, MESES_CORTOS } from "@/lib/finanzas"
import { getUnidadesVendidasPorModelo, getCategorias } from "@/lib/finanzas-data"
import { formatDate } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET ?anio= → Excel del dashboard anual (matriz + unidades + movimientos). */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const anio = sp.get("anio") != null ? Number(sp.get("anio")) : new Date().getFullYear()

  const [movimientos, unidades, categorias] = await Promise.all([
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } },
      include: { cuenta: true },
    }),
    getUnidadesVendidasPorModelo(anio),
    getCategorias(),
  ])
  const d = calcularDashboardAnual(JSON.parse(JSON.stringify(movimientos)), anio, categorias.ingreso, categorias.gasto)

  const header = ["Concepto", ...MESES_CORTOS, "TOTAL"]
  const fila = (label: string, meses: number[], total: number) => [label, ...meses, total]

  const matriz: (string | number)[][] = [
    [`VESPA BAHÍA — Dashboard Anual ${anio}`],
    [],
    header,
    ["INGRESOS"],
    ...d.ingresos.map((f) => fila(f.categoria, f.meses, f.total)),
    fila("TOTAL INGRESOS", d.totalIngresosMes, d.totalIngresosAnual),
    ["GASTOS"],
    ...d.gastos.map((f) => fila(f.categoria, f.meses, f.total)),
    fila("TOTAL GASTOS", d.totalGastosMes, d.totalGastosAnual),
    fila("RESULTADO", d.resultadoMes, d.resultadoAnual),
    fila("ACUMULADO", d.resultadoAcumulado, d.resultadoAcumulado[11]),
    [],
    ["UNIDADES VENDIDAS"],
    ...unidades.map((u) => fila(u.modelo, u.meses, u.total)),
  ]

  const delAnio = movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  const movs: (string | number)[][] = [
    ["Fecha", "Tipo", "Categoría", "Descripción", "Cuenta", "Moneda", "Monto"],
    ...delAnio.map((m) => [formatDate(m.fecha), m.tipo, m.categoria, m.descripcion, m.cuenta.nombre, m.moneda, m.monto]),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matriz), `Anual ${anio}`)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movs), "Movimientos")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vespabahia-anual-${anio}.xlsx"`,
    },
  })
}

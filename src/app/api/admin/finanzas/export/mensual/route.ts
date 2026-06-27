import { NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"
import { calcularResumenMensual, MESES_ES } from "@/lib/finanzas"
import { getCategorias } from "@/lib/finanzas-data"
import { formatDate } from "@/lib/admin-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET ?mes=&anio= → Excel del resumen mensual + movimientos del mes. */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const now = new Date()
  const mes = sp.get("mes") != null ? Number(sp.get("mes")) - 1 : now.getMonth()
  const anio = sp.get("anio") != null ? Number(sp.get("anio")) : now.getFullYear()

  const [cuentas, movimientos, categorias] = await Promise.all([
    prisma.cuentaFinanciera.findMany({ orderBy: { orden: "asc" } }),
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } },
      include: { cuenta: true },
    }),
    getCategorias(),
  ])
  const r = calcularResumenMensual(JSON.parse(JSON.stringify(movimientos)), cuentas, mes, anio, categorias.ingreso, categorias.gasto)

  // Hoja Resumen
  const resumen: (string | number)[][] = [
    [`VESPA BAHÍA — Resumen ${MESES_ES[mes]} ${anio}`],
    [],
    ["INGRESOS", "Monto"],
    ...r.ingresos.map((l) => [l.categoria, l.monto]),
    ["TOTAL INGRESOS", r.totalIngresos],
    [],
    ["GASTOS", "Monto"],
    ...r.gastos.map((l) => [l.categoria, l.monto]),
    ["TOTAL GASTOS", r.totalGastos],
    [],
    ["RESULTADO DEL MES", r.resultado],
    ["MARGEN (%)", Number(r.margen.toFixed(1))],
    [],
    ["MOVIMIENTOS USD", "Monto USD"],
    ["Ingresos USD", r.ingresosUSD],
    ["Gastos USD", r.gastosUSD],
    ["Resultado USD", r.resultadoUSD],
    [],
    ["NETO POR CUENTA (ARS)", "Neto del mes"],
    ...r.netoPorCuenta.map((n) => [n.cuenta, n.neto]),
  ]

  // Hoja Movimientos del mes
  const delMes = movimientos
    .filter((m) => { const f = new Date(m.fecha); return f.getMonth() === mes && f.getFullYear() === anio })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  const movs: (string | number)[][] = [
    ["Fecha", "Tipo", "Categoría", "Descripción", "Cuenta", "Moneda", "Monto"],
    ...delMes.map((m) => [formatDate(m.fecha), m.tipo, m.categoria, m.descripcion, m.cuenta.nombre, m.moneda, m.monto]),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movs), "Movimientos")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vespabahia-resumen-${anio}-${String(mes + 1).padStart(2, "0")}.xlsx"`,
    },
  })
}

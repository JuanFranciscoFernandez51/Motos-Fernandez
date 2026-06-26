import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { requireAdmin } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { rangoMes } from "@/lib/finanzas"
import { getDashboardAnual } from "@/lib/finanzas-data"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

/**
 * GET /api/admin/finanzas/export?tipo=mensual&mes=yyyy-mm&incluirNegro=0|1
 *     GET /api/admin/finanzas/export?tipo=anual&anio=2026&incluirNegro=0|1
 * Por defecto exporta SOLO lo registrado (blanco). incluirNegro=1 incluye todo.
 */
export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const url = new URL(request.url)
  const tipo = url.searchParams.get("tipo") || "mensual"
  const incluirNegro = url.searchParams.get("incluirNegro") === "1"

  const wb = XLSX.utils.book_new()
  let nombreArchivo = "finanzas"

  if (tipo === "anual") {
    const anio = parseInt(url.searchParams.get("anio") || "") || new Date().getUTCFullYear()
    const d = await getDashboardAnual(anio)
    const head = ["Categoría", ...MESES, "Total"]
    const rows: (string | number)[][] = [head]
    for (const c of d.categorias) {
      rows.push([`${c.tipo === "INGRESO" ? "[ING] " : "[GAS] "}${c.nombre}`, ...c.montos, c.total])
    }
    rows.push([])
    rows.push(["Resultado mes", ...d.mensual.map((m) => m.resultado), d.resultadoAnual])
    rows.push(["Acumulado", ...d.mensual.map((m) => m.acumulado), ""])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Anual ${anio}`)
    nombreArchivo = `finanzas-anual-${anio}`
  } else {
    const mesStr = url.searchParams.get("mes") || ""
    const ar = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const [anio, mes] = (mesStr || `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, "0")}`).split("-").map((n) => parseInt(n, 10))
    const { desde, hasta } = rangoMes(anio, mes)
    const where: Record<string, unknown> = { fecha: { gte: desde, lt: hasta } }
    if (!incluirNegro) where.registrado = true
    const movs = await prisma.movimientoFinanciero.findMany({
      where,
      orderBy: { fecha: "asc" },
      include: { cuenta: { select: { nombre: true } } },
    })

    // Hoja Movimientos
    const movRows: (string | number)[][] = [
      ["Fecha", "Tipo", "Categoría", "Descripción", "Cuenta", "Monto", "Moneda", "Registrado"],
    ]
    for (const m of movs) {
      movRows.push([
        m.fecha.toISOString().slice(0, 10),
        m.tipo,
        m.categoria,
        m.descripcion,
        m.cuenta.nombre,
        m.monto,
        m.moneda,
        m.registrado ? "Sí" : "No",
      ])
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movRows), "Movimientos")

    // Hoja Resumen por categoría (ARS)
    const porCat = new Map<string, { tipo: string; total: number }>()
    let ing = 0, gas = 0
    for (const m of movs) {
      if (m.moneda !== "ARS" || m.tipo === "TRANSFERENCIA") continue
      const acc = porCat.get(m.categoria) || { tipo: m.tipo, total: 0 }
      acc.total += m.monto
      porCat.set(m.categoria, acc)
      if (m.tipo === "INGRESO") ing += m.monto; else gas += m.monto
    }
    const resRows: (string | number)[][] = [["Categoría", "Tipo", "Total ARS"]]
    for (const [nombre, v] of porCat) resRows.push([nombre, v.tipo, v.total])
    resRows.push([])
    resRows.push(["TOTAL INGRESOS", "", ing])
    resRows.push(["TOTAL GASTOS", "", gas])
    resRows.push(["RESULTADO", "", ing - gas])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resRows), "Resumen")

    nombreArchivo = `finanzas-${anio}-${String(mes).padStart(2, "0")}${incluirNegro ? "-completo" : "-blanco"}`
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.xlsx"`,
    },
  })
}

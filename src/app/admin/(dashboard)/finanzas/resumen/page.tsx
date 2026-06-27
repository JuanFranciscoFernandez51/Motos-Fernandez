import { prisma } from "@/lib/prisma"
import { FinanzasNav } from "@/components/admin/finanzas/finanzas-nav"
import { PeriodoSelector } from "@/components/admin/finanzas/periodo-selector"
import { calcularResumenMensual, MESES_ES } from "@/lib/finanzas"
import { getCategorias } from "@/lib/finanzas-data"
import { formatMoney } from "@/lib/admin-helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ResumenMensualPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const mes = sp.mes != null ? Number(sp.mes) - 1 : now.getMonth()
  const anio = sp.anio != null ? Number(sp.anio) : now.getFullYear()

  const [cuentas, movimientos, chequesMes, cuentasCobrarPagar, categorias] = await Promise.all([
    prisma.cuentaFinanciera.findMany({ orderBy: { orden: "asc" } }),
    prisma.movimientoFinanciero.findMany({
      where: { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } },
      include: { cuenta: true },
    }),
    prisma.cheque.findMany({
      where: { estado: "CONCRETADO", fechaConcretado: { gte: new Date(anio, mes, 1), lt: new Date(anio, mes + 1, 1) } },
      orderBy: { fechaConcretado: "asc" },
    }),
    prisma.cuentaPorCobrar.findMany(),
    getCategorias(),
  ])
  const chequesCobrados = chequesMes.filter((c) => c.tipo === "A_COBRAR")
  const chequesPagados = chequesMes.filter((c) => c.tipo === "A_PAGAR")

  // Cuentas a cobrar/pagar del mes (informativo, NO entra al resultado de caja)
  const iniMes = new Date(anio, mes, 1), finMes = new Date(anio, mes + 1, 1)
  const enMes = (d: Date | null) => !!d && new Date(d) >= iniMes && new Date(d) < finMes
  const sumar = (s: "COBRAR" | "PAGAR", campo: "venc" | "conc") =>
    cuentasCobrarPagar
      .filter((c) => c.sentido === s && c.moneda === "ARS" && (
        campo === "venc" ? (c.estado === "PENDIENTE" && enMes(c.fechaVencimiento)) : (c.estado === "COBRADO" && enMes(c.fechaCobro))
      ))
      .reduce((a, c) => a + c.monto, 0)
  const cxc = {
    venceCobrar: sumar("COBRAR", "venc"), cobrado: sumar("COBRAR", "conc"),
    vencePagar: sumar("PAGAR", "venc"), pagado: sumar("PAGAR", "conc"),
  }
  const hayCxc = cxc.venceCobrar || cxc.cobrado || cxc.vencePagar || cxc.pagado

  const r = calcularResumenMensual(JSON.parse(JSON.stringify(movimientos)), cuentas, mes, anio, categorias.ingreso, categorias.gasto)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-sm text-gray-500">Resumen de {MESES_ES[mes]} {anio}.</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodoSelector base="/admin/finanzas/resumen" mes={mes} anio={anio} />
          <a
            href={`/api/admin/finanzas/export/mensual?mes=${mes + 1}&anio=${anio}`}
            className="inline-flex items-center gap-1.5 h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
            title="Descargar Excel del mes (para el contador)"
          >
            <Download className="h-4 w-4" /> Excel
          </a>
        </div>
      </div>
      <FinanzasNav />

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Ingresos" valor={r.totalIngresos} color="text-emerald-700" />
        <Kpi label="Gastos" valor={r.totalGastos} color="text-red-700" />
        <Kpi label="Resultado" valor={r.resultado} color={r.resultado >= 0 ? "text-gray-900" : "text-red-700"} />
        <Kpi label="Margen" valorTexto={`${r.margen.toFixed(1)}%`} color="text-gray-900" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <TablaCategorias titulo="Ingresos" lineas={r.ingresos} total={r.totalIngresos} acento="emerald" />
        <TablaCategorias titulo="Gastos" lineas={r.gastos} total={r.totalGastos} acento="red" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Neto por cuenta */}
        <Card>
          <CardHeader><CardTitle className="text-base">Movimiento neto por cuenta (ARS)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {r.netoPorCuenta.map((n) => (
              <div key={n.cuenta} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-700">{n.cuenta}</span>
                <span className={`tabular-nums font-medium ${n.neto < 0 ? "text-red-600" : "text-gray-900"}`}>{formatMoney(n.neto)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* USD */}
        <Card>
          <CardHeader><CardTitle className="text-base">Movimientos en USD</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Linea label="Ingresos USD" valor={r.ingresosUSD} moneda="USD" />
            <Linea label="Gastos USD" valor={r.gastosUSD} moneda="USD" />
            <div className="flex items-center justify-between pt-2 font-bold">
              <span>Resultado USD</span>
              <span className={`tabular-nums ${r.resultadoUSD < 0 ? "text-red-600" : "text-emerald-700"}`}>{formatMoney(r.resultadoUSD, "USD")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {chequesMes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cheques del mes</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Cobrados ({chequesCobrados.length})</p>
              {chequesCobrados.length === 0 ? <p className="text-gray-400">—</p> : chequesCobrados.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{c.beneficiario}</span>
                  <span className="tabular-nums font-medium text-emerald-700">{formatMoney(c.monto, c.moneda)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Pagados ({chequesPagados.length})</p>
              {chequesPagados.length === 0 ? <p className="text-gray-400">—</p> : chequesPagados.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{c.beneficiario}</span>
                  <span className="tabular-nums font-medium text-red-700">{formatMoney(c.monto, c.moneda)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hayCxc && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cuentas a cobrar / pagar del mes</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#CE9F33" }}>A cobrar</p>
              <Linea label="Vence este mes" valor={cxc.venceCobrar} />
              <Linea label="Cobrado este mes" valor={cxc.cobrado} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">A pagar</p>
              <Linea label="Vence este mes" valor={cxc.vencePagar} />
              <Linea label="Pagado este mes" valor={cxc.pagado} />
            </div>
            <p className="sm:col-span-2 text-[11px] text-gray-400">Informativo. No entra en el resultado del mes (ese es de caja: lo que entró/salió de verdad en Movimientos).</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Kpi({ label, valor, valorTexto, color }: { label: string; valor?: number; valorTexto?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</div>
        <div className={`text-xl md:text-2xl font-bold tabular-nums ${color}`}>{valorTexto ?? formatMoney(valor ?? 0)}</div>
      </CardContent>
    </Card>
  )
}

function Linea({ label, valor, moneda = "ARS" }: { label: string; valor: number; moneda?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-700">{label}</span>
      <span className="tabular-nums font-medium text-gray-900">{formatMoney(valor, moneda)}</span>
    </div>
  )
}

function TablaCategorias({
  titulo, lineas, total, acento,
}: {
  titulo: string
  lineas: { categoria: string; monto: number }[]
  total: number
  acento: "emerald" | "red"
}) {
  const color = acento === "emerald" ? "text-emerald-700" : "text-red-700"
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-0.5">
        {lineas.map((l) => (
          <div key={l.categoria} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
            <span className="text-gray-600">{l.categoria}</span>
            <span className={`tabular-nums ${l.monto > 0 ? "text-gray-900 font-medium" : "text-gray-300"}`}>{formatMoney(l.monto)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2.5 font-bold">
          <span>Total {titulo.toLowerCase()}</span>
          <span className={`tabular-nums ${color}`}>{formatMoney(total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

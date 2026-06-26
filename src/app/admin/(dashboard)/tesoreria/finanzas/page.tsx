import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/admin-helpers"
import { getCuentasConSaldo, getResumenMes, getPosicionTotal } from "@/lib/finanzas-data"
import { FinanzasNav } from "./finanzas-nav"
import { Wallet, TrendingUp, TrendingDown, Banknote } from "lucide-react"

export const dynamic = "force-dynamic"

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

export default async function FinanzasPage() {
  const now = new Date()
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const anio = ar.getUTCFullYear()
  const mes = ar.getUTCMonth() + 1

  const [cuentas, resumen, posicion] = await Promise.all([
    getCuentasConSaldo(),
    getResumenMes(anio, mes),
    getPosicionTotal(),
  ])

  const { ars, usd } = resumen

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="size-6 text-[#6B4F7A]" /> Finanzas
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Libro de caja del negocio — ingresos, gastos, saldos y resultado real.
        </p>
      </div>

      <FinanzasNav />

      {/* Resultado del mes actual */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
          Resultado de {MESES[mes - 1]} {anio}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-300 text-xs uppercase font-semibold">
                <TrendingUp className="size-4" /> Ingresos
              </div>
              <p className="text-2xl font-bold mt-1">{formatMoney(ars.ingresos, "ARS")}</p>
              <p className="text-xs text-gray-400 mt-1">
                Blanco {formatMoney(ars.blanco.ingresos, "ARS")} · Negro {formatMoney(ars.negro.ingresos, "ARS")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-300 text-xs uppercase font-semibold">
                <TrendingDown className="size-4" /> Gastos
              </div>
              <p className="text-2xl font-bold mt-1">{formatMoney(ars.gastos, "ARS")}</p>
              <p className="text-xs text-gray-400 mt-1">
                Blanco {formatMoney(ars.blanco.gastos, "ARS")} · Negro {formatMoney(ars.negro.gastos, "ARS")}
              </p>
            </CardContent>
          </Card>
          <Card className={ars.resultado >= 0 ? "border-green-300" : "border-red-300"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-[#6B4F7A] text-xs uppercase font-semibold">
                <Banknote className="size-4" /> Resultado
              </div>
              <p className={`text-2xl font-bold mt-1 ${ars.resultado >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {formatMoney(ars.resultado, "ARS")}
              </p>
              <p className="text-xs text-gray-400 mt-1">Margen {ars.margen.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
        {(usd.ingresos > 0 || usd.gastos > 0) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            USD del mes: ingresos {formatMoney(usd.ingresos, "USD")} · gastos {formatMoney(usd.gastos, "USD")} · resultado{" "}
            <strong>{formatMoney(usd.resultado, "USD")}</strong>
          </p>
        )}
      </div>

      {/* Saldos por cuenta */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Saldos por cuenta</h2>
        {cuentas.length === 0 ? (
          <p className="text-sm text-gray-400">No hay cuentas cargadas.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cuentas.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {c.nombre}
                    {c.excluirDeResultado && (
                      <span className="text-[9px] rounded bg-gray-100 dark:bg-neutral-800 px-1">no result.</span>
                    )}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${c.saldo < 0 ? "text-red-600 dark:text-red-300" : ""}`}>
                    {formatMoney(c.saldo, c.moneda)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{c.moneda} · {c.movimientos} mov.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Posición total */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Posición total (ARS)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <PosItem label="Caja (cuentas ARS)" value={formatMoney(posicion.saldosArs, "ARS")} />
            <PosItem label="Por cobrar" value={formatMoney(posicion.porCobrar, "ARS")} positivo />
            <PosItem label="Por pagar" value={`- ${formatMoney(posicion.porPagar, "ARS")}`} negativo />
            <PosItem label="Stock propio (toma)" value={formatMoney(posicion.stockPropio, "ARS")} />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-sm font-semibold">Posición total estimada</span>
            <span className="text-2xl font-bold text-[#6B4F7A]">{formatMoney(posicion.posicionArs, "ARS")}</span>
          </div>
          {posicion.saldosUsd !== 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              + Caja en USD: <strong>{formatMoney(posicion.saldosUsd, "USD")}</strong> (no se suma a la posición en pesos)
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-2">
            El stock propio cuenta solo las motos tomadas en parte de pago / compradas (valor de toma). Las de
            consignación no son activo nuestro.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function PosItem({ label, value, positivo, negativo }: { label: string; value: string; positivo?: boolean; negativo?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`font-bold mt-0.5 ${positivo ? "text-green-700 dark:text-green-300" : negativo ? "text-red-600 dark:text-red-300" : ""}`}>
        {value}
      </p>
    </div>
  )
}

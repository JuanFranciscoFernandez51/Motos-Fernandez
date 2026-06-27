import Link from "next/link"
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney, formatDate } from "@/lib/admin-helpers"

/**
 * Alertas de vencimientos financieros de los próximos días (cuentas a cobrar/
 * pagar y cheques pendientes). Se muestra en el inicio del admin.
 */
export async function FinanzasAlertas() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const limite = new Date(); limite.setDate(limite.getDate() + 8); limite.setHours(0, 0, 0, 0)

  const [cuentas, cheques] = await Promise.all([
    prisma.cuentaPorCobrar.findMany({
      where: { estado: "PENDIENTE", fechaVencimiento: { not: null, lte: limite } },
    }),
    prisma.cheque.findMany({
      where: { estado: "PENDIENTE", fechaVencimiento: { lte: limite } },
    }),
  ])

  const items = [
    ...cuentas.map((c) => ({ dir: c.sentido === "COBRAR" ? "cobrar" : "pagar", label: c.cliente, sub: c.tipo, monto: c.monto, moneda: c.moneda, venc: c.fechaVencimiento! })),
    ...cheques.map((c) => ({ dir: c.tipo === "A_COBRAR" ? "cobrar" : "pagar", label: c.beneficiario, sub: "Cheque", monto: c.monto, moneda: c.moneda, venc: c.fechaVencimiento })),
  ]
    .map((i) => ({ ...i, vencido: new Date(i.venc) < hoy }))
    .sort((a, b) => new Date(a.venc).getTime() - new Date(b.venc).getTime())

  if (items.length === 0) return null

  const vencidos = items.filter((i) => i.vencido).length

  return (
    <Card className="border-amber-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-500" />
          Vencimientos financieros (próximos días)
        </CardTitle>
        <Link href="/admin/finanzas/cuentas-y-cheques" className="text-xs text-[#7C3AED] hover:underline inline-flex items-center gap-1">Ver todo <ArrowRight className="h-3 w-3" /></Link>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {vencidos > 0 && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-3 py-2 text-xs mb-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Tenés <strong>{vencidos}</strong> {vencidos === 1 ? "vencido" : "vencidos"} sin saldar.
          </div>
        )}
        {items.slice(0, 8).map((i, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-gray-50 last:border-0 py-1.5">
            <span className="text-gray-700 truncate max-w-[55%]">
              <span className={i.dir === "cobrar" ? "text-[#CE9F33]" : "text-red-600"}>{i.dir === "cobrar" ? "▲ Cobrás" : "▼ Pagás"}</span>{" "}
              {i.label} <span className="text-gray-400">· {i.sub}</span>
            </span>
            <span className="text-right">
              <span className={`text-xs ${i.vencido ? "text-red-600 font-medium" : "text-gray-500"}`}>{formatDate(i.venc)}{i.vencido ? " · vencido" : ""}</span>{" · "}
              <span className="tabular-nums font-medium text-gray-800">{formatMoney(i.monto, i.moneda)}</span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { HandCoins, TrendingDown, FileCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatMoney } from "@/lib/admin-helpers"
import { cn } from "@/lib/utils"
import { CuentasACobrarCliente } from "./cuentas-a-cobrar-cliente"
import { ChequesCliente } from "./cheques-cliente"

type Props = {
  cobros: React.ComponentProps<typeof CuentasACobrarCliente>["cobros"]
  pagos: React.ComponentProps<typeof CuentasACobrarCliente>["cobros"]
  cheques: React.ComponentProps<typeof ChequesCliente>["cheques"]
  cuentasFinancieras: React.ComponentProps<typeof ChequesCliente>["cuentasFinancieras"]
  totalCobrar: number
  totalPagar: number
}

export function CuentasYChequesCliente({ cobros, pagos, cheques, cuentasFinancieras, totalCobrar, totalPagar }: Props) {
  const [tab, setTab] = useState<"cobrar" | "pagar" | "cheques">("cobrar")
  const neto = totalCobrar - totalPagar

  const TABS = [
    { id: "cobrar" as const, label: "Cuentas a cobrar", icon: HandCoins },
    { id: "pagar" as const, label: "Cuentas a pagar", icon: TrendingDown },
    { id: "cheques" as const, label: "Cheques", icon: FileCheck },
  ]

  return (
    <div className="space-y-6">
      {/* Resumen: a cobrar / a pagar / neto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Total a cobrar</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: "#CE9F33" }}>{formatMoney(totalCobrar)}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Cuentas + cheques a cobrar (ARS)</div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Total a pagar</div>
          <div className="text-2xl font-bold tabular-nums text-red-700">{formatMoney(totalPagar)}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Cuentas + cheques a pagar (ARS)</div>
        </CardContent></Card>
        <Card style={{ borderColor: neto >= 0 ? "#7ECAD655" : "#C8102E33" }}>
          <CardContent className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Posición neta</div>
            <div className={cn("text-2xl font-bold tabular-nums", neto >= 0 ? "text-emerald-700" : "text-red-700")}>{formatMoney(neto)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{neto >= 0 ? "Te queda a favor" : "Te queda en contra"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-pestañas */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-[#7ECAD6]/15 text-[#3A8B96]" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cobrar" && <CuentasACobrarCliente cobros={cobros} sentido="COBRAR" cuentasFinancieras={cuentasFinancieras} />}
      {tab === "pagar" && <CuentasACobrarCliente cobros={pagos} sentido="PAGAR" cuentasFinancieras={cuentasFinancieras} />}
      {tab === "cheques" && <ChequesCliente cheques={cheques} cuentasFinancieras={cuentasFinancieras} />}
    </div>
  )
}

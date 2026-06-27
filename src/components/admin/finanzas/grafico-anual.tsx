"use client"

import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts"
import { MESES_CORTOS } from "@/lib/finanzas"

type Props = {
  ingresos: number[]
  gastos: number[]
  resultado: number[]
}

function fmtEje(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (abs >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export function GraficoAnual({ ingresos, gastos, resultado }: Props) {
  const data = MESES_CORTOS.map((mes, i) => ({
    mes,
    Ingresos: ingresos[i] || 0,
    Gastos: gastos[i] || 0,
    Resultado: resultado[i] || 0,
  })).filter((d) => d.Ingresos || d.Gastos)

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">Sin datos para graficar todavía.</p>
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtEje} tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(v) => `$ ${Number(v).toLocaleString("es-AR")}`}
            contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Ingresos" fill="#34a87a" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="Gastos" fill="#e26d6d" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line type="monotone" dataKey="Resultado" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

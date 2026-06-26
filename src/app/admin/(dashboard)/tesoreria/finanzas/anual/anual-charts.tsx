"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

type Punto = { mes: number; ingresos: number; gastos: number; acumulado: number }

const fmtK = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

export function AnualCharts({ data }: { data: Punto[] }) {
  const chartData = data.map((d) => ({
    name: MESES[d.mes - 1],
    Ingresos: d.ingresos,
    Gastos: d.gastos,
    Acumulado: d.acumulado,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis fontSize={11} tickFormatter={fmtK} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            formatter={(v: unknown) => `$ ${Number(v).toLocaleString("es-AR")}`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Ingresos" fill="#16a34a" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Gastos" fill="#dc2626" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="Acumulado" stroke="#6B4F7A" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

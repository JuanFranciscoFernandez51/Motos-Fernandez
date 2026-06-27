"use client"

import { useRouter } from "next/navigation"
import { MESES_ES } from "@/lib/finanzas"

export function PeriodoSelector({
  base,
  mes,
  anio,
  conMes = true,
}: {
  base: string // "/admin/finanzas/resumen"
  mes?: number // 0-11
  anio: number
  conMes?: boolean
}) {
  const router = useRouter()
  const ir = (m: number, y: number) => {
    const q = conMes ? `?mes=${m + 1}&anio=${y}` : `?anio=${y}`
    router.push(`${base}${q}`)
  }
  return (
    <div className="flex items-center gap-2">
      {conMes && (
        <select
          value={mes ?? 0}
          onChange={(e) => ir(Number(e.target.value), anio)}
          className="h-9 rounded-md border border-gray-300 px-2 text-sm font-medium"
        >
          {MESES_ES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      )}
      <select
        value={anio}
        onChange={(e) => ir(mes ?? 0, Number(e.target.value))}
        className="h-9 rounded-md border border-gray-300 px-2 text-sm font-medium"
      >
        {[anio - 2, anio - 1, anio, anio + 1].map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

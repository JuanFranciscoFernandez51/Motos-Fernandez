"use client"

import { useRouter } from "next/navigation"

/** Selector de mes (yyyy-mm) que navega con ?mes=. */
export function MesSelector({ mes, basePath }: { mes: string; basePath: string }) {
  const router = useRouter()
  return (
    <input
      type="month"
      value={mes}
      onChange={(e) => router.push(`${basePath}?mes=${e.target.value}`)}
      className="rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
    />
  )
}

/** Selector de año que navega con ?anio=. */
export function AnioSelector({ anio, basePath }: { anio: number; basePath: string }) {
  const router = useRouter()
  const actual = new Date().getUTCFullYear()
  const anios = [actual + 1, actual, actual - 1, actual - 2, actual - 3]
  return (
    <select
      value={anio}
      onChange={(e) => router.push(`${basePath}?anio=${e.target.value}`)}
      className="rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
    >
      {anios.map((a) => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
  )
}

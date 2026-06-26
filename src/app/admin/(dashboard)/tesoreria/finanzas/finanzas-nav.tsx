"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// Las pestañas se van habilitando por etapa. Las no construidas se muestran
// en gris (sin link) para que se vea el mapa de lo que viene.
const TABS: { href: string; label: string; enabled: boolean }[] = [
  { href: "/admin/tesoreria/finanzas", label: "Resumen general", enabled: true },
  { href: "/admin/tesoreria/finanzas/movimientos", label: "Movimientos", enabled: true },
  { href: "/admin/tesoreria/finanzas/cuentas-cheques", label: "Cuentas y cheques", enabled: true },
  { href: "/admin/tesoreria/finanzas/mensual", label: "Resumen mensual", enabled: true },
  { href: "/admin/tesoreria/finanzas/anual", label: "Dashboard anual", enabled: true },
  { href: "/admin/tesoreria/finanzas/cuentas", label: "Cuentas", enabled: true },
  { href: "/admin/tesoreria/finanzas/costos", label: "Costos fijos", enabled: true },
  { href: "/admin/tesoreria/finanzas/calculador", label: "Calculador", enabled: true },
  { href: "/admin/tesoreria/finanzas/ia", label: "Cargar con IA", enabled: true },
]

export function FinanzasNav() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-neutral-800 pb-px">
      {TABS.map((t) => {
        const active = pathname === t.href
        if (!t.enabled) {
          return (
            <span
              key={t.href}
              className="whitespace-nowrap px-3 py-2 text-sm text-gray-300 dark:text-neutral-700 cursor-default"
              title="Próximamente"
            >
              {t.label}
            </span>
          )
        }
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active
                ? "border-[#6B4F7A] text-[#6B4F7A] font-semibold"
                : "border-transparent text-gray-600 dark:text-gray-300 hover:text-[#6B4F7A]"
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

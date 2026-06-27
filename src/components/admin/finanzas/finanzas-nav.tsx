"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wallet, ArrowLeftRight, CalendarRange, BarChart3, Landmark, Receipt, Calculator, HandCoins } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/admin/finanzas/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/admin/finanzas", label: "Resumen general", icon: Wallet, exact: true },
  { href: "/admin/finanzas/cuentas-y-cheques", label: "Cuentas y cheques", icon: HandCoins },
  { href: "/admin/finanzas/resumen", label: "Resumen mensual", icon: CalendarRange },
  { href: "/admin/finanzas/anual", label: "Dashboard anual", icon: BarChart3 },
  { href: "/admin/finanzas/cuentas", label: "Cuentas", icon: Landmark },
  { href: "/admin/finanzas/costos-fijos", label: "Costos fijos", icon: Receipt },
  { href: "/admin/finanzas/calculador", label: "Calculador precios", icon: Calculator },
]

export function FinanzasNav() {
  const pathname = usePathname()
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3 mb-6">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : (pathname === t.href || pathname.startsWith(t.href + "/"))
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-[#C4A5F7]/15 text-[#7C3AED]"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import {
  LayoutDashboard,
  Bike,
  ShoppingBag,
  Package,
  Users,
  CalendarClock,
  Megaphone,
  Newspaper,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Ticket,
  CreditCard,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/modelos", label: "Modelos", icon: Bike },
  { href: "/admin/productos", label: "Productos", icon: ShoppingBag },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/crm", label: "CRM", icon: Users },
  { href: "/admin/turnos", label: "Turnos", icon: CalendarClock },
  { href: "/admin/noticias", label: "Noticias", icon: Newspaper },
  { href: "/admin/cupones", label: "Cupones", icon: Ticket },
  { href: "/admin/financiacion", label: "Financiacion", icon: CreditCard },
  { href: "/admin/promociones", label: "Promociones", icon: Megaphone },
  { href: "/admin/asistente", label: "Asistente IA", icon: Bot },
  { href: "/admin/configuracion", label: "Config", icon: Settings },
]

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: (typeof navItems)[0]
  collapsed: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-[#6B4F7A]/10 text-[#6B4F7A]"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function AdminSidebar({ userName }: { userName: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/admin/login")
  }

  const sidebarContent = (mobile = false) => (
    <div className="flex h-full flex-col bg-neutral-950">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-4">
        {collapsed && !mobile ? (
          <Image
            src="/images/monograma-blanco-transparente.svg"
            alt="MF"
            width={160}
            height={113}
            className="h-9 w-auto shrink-0 "
          />
        ) : (
          <Image
            src="/images/monograma-blanco-transparente.svg"
            alt="Motos Fernandez"
            width={160}
            height={113}
            className="h-9 w-auto flex-1 min-w-0 "
          />
        )}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed && !mobile}
              onClick={mobile ? () => setMobileOpen(false) : undefined}
            />
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-neutral-800 px-3 py-4">
        <div
          className={cn(
            "flex items-center gap-3 mb-3 px-3",
            collapsed && !mobile && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-neutral-300 shrink-0">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          {(!collapsed || mobile) && (
            <span className="text-sm font-medium text-neutral-300 truncate">
              {userName}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30",
            collapsed && !mobile && "justify-center px-0"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobile) && <span className="ml-2">Cerrar sesion</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile trigger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-3 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="text-neutral-300 hover:bg-neutral-800" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-neutral-800">
            {sidebarContent(true)}
          </SheetContent>
        </Sheet>
        <Image
          src="/images/monograma-blanco-transparente.svg"
          alt="Motos Fernandez"
          width={160}
          height={113}
          className="h-8 w-auto "
        />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 border-r border-neutral-800 bg-neutral-950 transition-all duration-200",
          collapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        {sidebarContent(false)}
      </aside>
    </>
  )
}

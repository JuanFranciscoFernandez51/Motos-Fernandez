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
  ChevronDown,
  ChevronRight,
  Ticket,
  CreditCard,
  Bot,
  MessageCircleHeart,
  Mail,
  FileText,
  Wrench,
  Receipt,
  UserCircle,
  Tag,
  ListChecks,
  Truck as TruckIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ThemeToggleSegmented } from "@/components/theme-toggle"

type LucideIcon = typeof LayoutDashboard

// Estructura: items planos + grupos con submenú
type NavItem = { href: string; label: string; icon: LucideIcon }
type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}
type NavEntry = NavItem | NavGroup

const isGroup = (e: NavEntry): e is NavGroup => "items" in e

const navEntries: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },

  // Operativo — grupos nuevos
  {
    id: "gestion",
    label: "Gestión",
    icon: ListChecks,
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: UserCircle },
      { href: "/admin/mandatos", label: "Mandatos de venta", icon: FileText },
      { href: "/admin/ventas", label: "Ventas", icon: Receipt },
      { href: "/admin/proveedores", label: "Proveedores", icon: TruckIcon },
    ],
  },
  {
    id: "taller",
    label: "Taller",
    icon: Wrench,
    items: [
      { href: "/admin/taller", label: "Órdenes de trabajo", icon: FileText },
      { href: "/admin/taller/tipos-servicio", label: "Tipos de servicio", icon: Tag },
      { href: "/admin/turnos", label: "Turnos", icon: CalendarClock },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    icon: Bike,
    items: [
      { href: "/admin/modelos", label: "Modelos", icon: Bike },
      { href: "/admin/productos", label: "Productos tienda", icon: ShoppingBag },
      { href: "/admin/pedidos", label: "Pedidos online", icon: Package },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { href: "/admin/crm", label: "CRM / Leads", icon: Users },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
      { href: "/admin/noticias", label: "Noticias", icon: Newspaper },
      { href: "/admin/testimonios", label: "Testimonios", icon: MessageCircleHeart },
      { href: "/admin/cupones", label: "Cupones", icon: Ticket },
      { href: "/admin/promociones", label: "Promociones", icon: Megaphone },
      { href: "/admin/financiacion", label: "Planes financiación", icon: CreditCard },
    ],
  },

  { href: "/admin/asistente", label: "Asistente IA", icon: Bot },
  { href: "/admin/configuracion", label: "Config", icon: Settings },
]

function NavLink({
  item,
  collapsed,
  onClick,
  nested = false,
}: {
  item: NavItem
  collapsed: boolean
  onClick?: () => void
  nested?: boolean
}) {
  const pathname = usePathname()
  const isActive =
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname === item.href ||
        (pathname.startsWith(item.href + "/") && item.href !== "/admin")

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 text-sm transition-colors",
        nested ? "px-3 pl-9 font-normal" : "px-3 font-medium py-2.5",
        isActive
          ? "bg-[#6B4F7A]/10 text-[#6B4F7A] font-semibold"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      )}
    >
      <item.icon className={cn("shrink-0", nested ? "h-4 w-4" : "h-5 w-5")} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

function NavGroupItem({
  group,
  collapsed,
  onItemClick,
}: {
  group: NavGroup
  collapsed: boolean
  onItemClick?: () => void
}) {
  const pathname = usePathname()
  const hasActive = group.items.some(
    (it) => pathname === it.href || pathname.startsWith(it.href + "/")
  )
  const [open, setOpen] = useState(hasActive)

  if (collapsed) {
    // En modo colapsado, mostrar solo los items sin header de grupo (solo iconos)
    return (
      <div className="flex flex-col gap-1 border-t border-neutral-900 pt-1 mt-1">
        {group.items.map((it) => (
          <NavLink key={it.href} item={it} collapsed onClick={onItemClick} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
          hasActive
            ? "text-[#9B59B6]"
            : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
        )}
      >
        <group.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {group.items.map((it) => (
            <NavLink
              key={it.href}
              item={it}
              collapsed={false}
              onClick={onItemClick}
              nested
            />
          ))}
        </div>
      )}
    </div>
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
            className="h-9 w-auto shrink-0"
          />
        ) : (
          <Image
            src="/images/monograma-blanco-transparente.svg"
            alt="Motos Fernandez"
            width={160}
            height={113}
            className="h-9 w-auto flex-1 min-w-0"
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
          {navEntries.map((entry) =>
            isGroup(entry) ? (
              <NavGroupItem
                key={entry.id}
                group={entry}
                collapsed={collapsed && !mobile}
                onItemClick={mobile ? () => setMobileOpen(false) : undefined}
              />
            ) : (
              <NavLink
                key={entry.href}
                item={entry}
                collapsed={collapsed && !mobile}
                onClick={mobile ? () => setMobileOpen(false) : undefined}
              />
            )
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-neutral-800 px-3 py-4">
        {(!collapsed || mobile) && (
          <div className="mb-3 px-3 flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Tema
            </span>
            <ThemeToggleSegmented />
          </div>
        )}
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
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
            collapsed && !mobile && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!collapsed || mobile) && <span>Cerrar sesión</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop — fixed sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 border-r border-neutral-800 transition-all",
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile header + sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 border-b bg-white dark:bg-neutral-900 px-4 py-3 h-14">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-64">
            {sidebarContent(true)}
          </SheetContent>
        </Sheet>
        <Image
          src="/images/monograma-blanco-transparente.svg"
          alt="Motos Fernandez"
          width={160}
          height={113}
          className="h-8 w-auto invert"
        />
      </div>
    </>
  )
}

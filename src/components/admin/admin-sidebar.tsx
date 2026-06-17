"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Bike,
  ShoppingBag,
  Package,
  Users,
  CalendarClock,
  Megaphone,
  Newspaper,
  Trophy,
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
  Wallet,
} from "lucide-react"
import { InstagramIcon } from "@/components/icons/social"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ThemeToggleSegmented } from "@/components/theme-toggle"
import type { SeccionId } from "@/lib/secciones"

type LucideIcon = typeof LayoutDashboard

// Estructura: items planos + grupos con submenú.
// `seccion` es opcional: si está, filtra el item según permisos del usuario.
// Si no está (ej: dashboard genérico, /admin/usuarios para admin), tiene
// otra logica de visibilidad.
type NavItem = { href: string; label: string; icon: LucideIcon; seccion?: SeccionId; soloAdmin?: boolean }
type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}
type NavEntry = NavItem | NavGroup

const isGroup = (e: NavEntry): e is NavGroup => "items" in e

const navEntries: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, seccion: "DASHBOARD" },

  // Pedidos online — acceso directo de primer nivel
  { href: "/admin/pedidos", label: "Pedidos", icon: Package, seccion: "PEDIDOS" },

  // Operaciones diarias del negocio
  {
    id: "operaciones",
    label: "Operaciones",
    icon: ListChecks,
    items: [
      { href: "/admin/mandatos", label: "Mandatos de venta", icon: FileText, seccion: "MANDATOS" },
      { href: "/admin/ordenes-compra", label: "Órdenes de compra", icon: Receipt, seccion: "ORDENES_COMPRA" },
      { href: "/admin/stock-motos", label: "Stock motos", icon: Bike, seccion: "STOCK_MOTOS" },
      { href: "/admin/clientes", label: "Clientes", icon: UserCircle, seccion: "CLIENTES" },
      { href: "/admin/proveedores", label: "Proveedores", icon: TruckIcon, seccion: "PROVEEDORES" },
    ],
  },
  // Catálogo y stock
  {
    id: "catalogo",
    label: "Catálogo",
    icon: Bike,
    items: [
      { href: "/admin/modelos?condicion=USADA", label: "Catálogo · Usadas", icon: Bike, seccion: "MODELOS" },
      { href: "/admin/modelos?condicion=0KM", label: "Catálogo · 0KM", icon: Bike, seccion: "MODELOS" },
      { href: "/admin/productos", label: "Productos de tienda", icon: ShoppingBag, seccion: "PRODUCTOS" },
    ],
  },
  // Taller
  {
    id: "taller",
    label: "Taller",
    icon: Wrench,
    items: [
      { href: "/admin/taller", label: "Órdenes", icon: FileText, seccion: "TALLER" },
      { href: "/admin/presupuestos", label: "Presupuestos", icon: FileText, seccion: "PRESUPUESTOS" },
      { href: "/admin/turnos", label: "Turnos", icon: CalendarClock, seccion: "TURNOS" },
      { href: "/admin/taller/tipos-servicio", label: "Tipos de servicio", icon: Tag, seccion: "TALLER" },
    ],
  },
  // Tesorería: cobranzas, financiaciones
  {
    id: "tesoreria",
    label: "Tesorería",
    icon: Wallet,
    items: [
      { href: "/admin/tesoreria", label: "Resumen", icon: LayoutDashboard, seccion: "TESORERIA" },
      { href: "/admin/tesoreria/financiaciones", label: "Financiaciones", icon: CreditCard, seccion: "TESORERIA" },
    ],
  },
  // CRM y Mercado Libre quedan como entradas top-level (fuera de Marketing)
  // porque son herramientas operativas, no campañas.
  { href: "/admin/crm", label: "CRM / Leads", icon: Users, seccion: "CRM" },
  { href: "/admin/ml", label: "Mercado Libre", icon: ShoppingBag, seccion: "ML" },
  { href: "/admin/meta", label: "Instagram + FB", icon: InstagramIcon as LucideIcon, seccion: "META" },
  // Meta Ads separado: gasta presupuesto real, va con permiso aparte.
  { href: "/admin/meta/ads", label: "Meta Ads", icon: Megaphone, seccion: "META_ADS" },

  // Marketing y comunicación
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail, seccion: "NEWSLETTER" },
      { href: "/admin/noticias", label: "Noticias", icon: Newspaper, seccion: "NOTICIAS" },
      { href: "/admin/testimonios", label: "Testimonios", icon: MessageCircleHeart, seccion: "TESTIMONIOS" },
      { href: "/admin/cupones", label: "Cupones", icon: Ticket, seccion: "CUPONES" },
      { href: "/admin/promociones", label: "Promociones", icon: Megaphone, seccion: "PROMOCIONES" },
      { href: "/admin/marketing/mundial", label: "Modo Mundial", icon: Trophy, seccion: "PROMOCIONES" },
      { href: "/admin/financiacion", label: "Planes financiación", icon: CreditCard, seccion: "FINANCIACION_PLANES" },
    ],
  },

  { href: "/admin/outreach", label: "Outreach", icon: MessageCircleHeart, seccion: "OUTREACH" },
  { href: "/admin/asistente", label: "Asistente IA", icon: Bot, seccion: "ASISTENTE_IA" },
  { href: "/admin/sistema", label: "Sistema", icon: ListChecks, seccion: "SISTEMA" },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, soloAdmin: true },
  { href: "/admin/configuracion", label: "Config", icon: Settings, seccion: "CONFIGURACION" },
]

/**
 * Decide si un item debe mostrarse para un usuario con el role + permisos
 * indicados. Reglas:
 *  - admins ven todo
 *  - items con `soloAdmin: true` solo se muestran a admins
 *  - items sin `seccion` ni `soloAdmin` se ven a todos los logueados
 *  - items con `seccion` se muestran si la seccion esta en `permisos`
 */
function puedeVerItem(
  item: NavItem,
  role: string,
  permisos: string[]
): boolean {
  if (role === "admin") return true
  if (item.soloAdmin) return false
  if (!item.seccion) return true
  return permisos.includes(item.seccion)
}

function filtrarEntries(
  entries: NavEntry[],
  role: string,
  permisos: string[]
): NavEntry[] {
  const out: NavEntry[] = []
  for (const e of entries) {
    if (isGroup(e)) {
      const visibles = e.items.filter((it) => puedeVerItem(it, role, permisos))
      if (visibles.length > 0) {
        out.push({ ...e, items: visibles })
      }
    } else {
      if (puedeVerItem(e, role, permisos)) out.push(e)
    }
  }
  return out
}

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
  // Para "Resumen" (paths que terminan en raíz de un grupo, ej /admin/tesoreria),
  // requerir match exacto para no activarse con sub-rutas.
  const isExactOnly = item.href === "/admin" || item.href === "/admin/tesoreria"
  const isActive = isExactOnly
    ? pathname === item.href
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

export function AdminSidebar({
  userName,
  role = "admin",
  permisos = [],
}: {
  userName: string
  role?: string
  permisos?: string[]
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  // Filtramos las entradas segun permisos del usuario. Los admin ven todo.
  const visibleEntries = filtrarEntries(navEntries, role, permisos)

  // Persistir el estado collapsed en localStorage y reflejarlo como clase
  // en <body> para que el <main> del layout pueda ajustar su padding-left.
  // El layout es server component asi que no puede leer el state directamente.
  // Inicializamos desde localStorage al montar para no perder la preferencia
  // en cada navegacion.
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])
  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.classList.toggle("admin-sidebar-collapsed", collapsed)
    try {
      localStorage.setItem("admin-sidebar-collapsed", collapsed ? "true" : "false")
    } catch {
      // ignore quota errors
    }
  }, [collapsed])

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

      {/* min-h-0 es necesario para que flex-1 + overflow-y-auto funcione
          dentro de un contenedor flex-col (sino el contenido empuja la
          altura y el scroll nunca se activa). overscroll-contain evita
          que el scroll de la sidebar haga scroll de la pagina cuando
          llegas al final. */}
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 flex flex-col gap-1 admin-sidebar-scroll">
        {visibleEntries.map((entry) =>
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

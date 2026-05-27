/**
 * Catalogo de secciones del panel admin. Cada usuario `role="usuario"`
 * tiene una lista `permisos` con los IDs de seccion a los que puede acceder.
 *
 * Los usuarios `role="admin"` tienen acceso a TODAS las secciones
 * automaticamente, mas a /admin/usuarios (solo admin puede gestionar usuarios).
 *
 * Para sumar una seccion nueva: agregala aca y filtrala en la sidebar
 * (admin-sidebar.tsx) y en el server-side de su page con `requireSection()`.
 */

export type SeccionId =
  | "DASHBOARD"
  | "PEDIDOS"
  | "MANDATOS"
  | "ORDENES_COMPRA"
  | "CLIENTES"
  | "PROVEEDORES"
  | "STOCK_MOTOS"
  | "MODELOS"
  | "PRODUCTOS"
  | "TALLER"
  | "PRESUPUESTOS"
  | "TURNOS"
  | "TESORERIA"
  | "FINANCIACION_PLANES"
  | "ML"
  | "META"
  | "META_ADS"
  | "CRM"
  | "NEWSLETTER"
  | "NOTICIAS"
  | "TESTIMONIOS"
  | "CUPONES"
  | "PROMOCIONES"
  | "ASISTENTE_IA"
  | "OUTREACH"
  | "SISTEMA"
  | "CONFIGURACION"

export type SeccionInfo = {
  id: SeccionId
  label: string
  descripcion: string
  // grupo para mostrar agrupado en el form de permisos
  grupo: "OPERACIONES" | "CATALOGO" | "TALLER" | "TESORERIA" | "MARKETING" | "INTEGRACIONES" | "GENERAL" | "SISTEMA"
}

export const SECCIONES_ADMIN: SeccionInfo[] = [
  // GENERAL
  { id: "DASHBOARD",     label: "Dashboard",           descripcion: "Vista general con estadísticas y métricas", grupo: "GENERAL" },
  { id: "PEDIDOS",       label: "Pedidos online",      descripcion: "Pedidos de la tienda (cascos, ropa, etc)",  grupo: "GENERAL" },
  { id: "CRM",           label: "CRM / Leads",         descripcion: "Lista de leads y oportunidades",            grupo: "GENERAL" },

  // OPERACIONES
  { id: "MANDATOS",       label: "Mandatos",            descripcion: "Mandatos de venta de motos en consignación",     grupo: "OPERACIONES" },
  { id: "ORDENES_COMPRA", label: "Órdenes de compra",   descripcion: "Ventas de motos (OCs) con pagos y permutas",     grupo: "OPERACIONES" },
  { id: "CLIENTES",       label: "Clientes",            descripcion: "Ficha de clientes y su historial",                grupo: "OPERACIONES" },
  { id: "PROVEEDORES",    label: "Proveedores",         descripcion: "Lista de proveedores",                            grupo: "OPERACIONES" },
  { id: "STOCK_MOTOS",    label: "Stock motos",         descripcion: "Listado administrativo de motos (chasis, motor, patente, precios). Vista paralela al catálogo público." , grupo: "OPERACIONES" },

  // CATALOGO
  { id: "MODELOS",   label: "Catálogo de motos", descripcion: "Modelos de motos del catálogo público", grupo: "CATALOGO" },
  { id: "PRODUCTOS", label: "Tienda",            descripcion: "Cascos, ropa y accesorios de la tienda", grupo: "CATALOGO" },

  // TALLER
  { id: "TALLER",        label: "Taller (OT)",     descripcion: "Órdenes de trabajo del taller",                 grupo: "TALLER" },
  { id: "PRESUPUESTOS",  label: "Presupuestos",    descripcion: "Presupuestos del taller",                        grupo: "TALLER" },
  { id: "TURNOS",        label: "Turnos",          descripcion: "Turnos de servicio técnico",                     grupo: "TALLER" },

  // TESORERIA
  { id: "TESORERIA",            label: "Tesorería · Financiaciones",  descripcion: "Cobranzas, financiaciones de OCs, cuotas vencidas",          grupo: "TESORERIA" },
  // OJO: esto NO son las financiaciones de las OCs. Son los planes
  // que se muestran en el sitio publico para que los visitantes calculen
  // cuotas. Por eso queda en MARKETING (no en tesoreria).
  { id: "FINANCIACION_PLANES",  label: "Planes de financiación (web pública)",  descripcion: "Planes/calculadora de cuotas que se muestran en el sitio público — NO son las financiaciones reales de las OCs (esas están en Tesorería)",  grupo: "MARKETING" },

  // MARKETING
  { id: "NEWSLETTER",   label: "Newsletter",   descripcion: "Suscriptores y campañas",  grupo: "MARKETING" },
  { id: "NOTICIAS",     label: "Noticias",     descripcion: "Blog / noticias del sitio", grupo: "MARKETING" },
  { id: "TESTIMONIOS",  label: "Testimonios",  descripcion: "Testimonios de clientes",   grupo: "MARKETING" },
  { id: "CUPONES",      label: "Cupones",      descripcion: "Cupones de descuento",      grupo: "MARKETING" },
  { id: "PROMOCIONES",  label: "Promociones",  descripcion: "Banners y promociones",     grupo: "MARKETING" },
  { id: "OUTREACH",     label: "Outreach",     descripcion: "Cola de mensajes a clientes (NPS + service)", grupo: "MARKETING" },

  // INTEGRACIONES
  { id: "ML",            label: "Mercado Libre",  descripcion: "Publicaciones en ML",                  grupo: "INTEGRACIONES" },
  { id: "META",          label: "Instagram + Facebook (orgánico)", descripcion: "Publicaciones gratuitas en IG y FB: manual + calendario programado", grupo: "INTEGRACIONES" },
  // META_ADS: campañas pagas (Marketing API). Separado de META porque
  // gasta presupuesto real — quien tiene permiso META puede programar
  // posts orgánicos sin riesgo de plata, pero solo quien tenga META_ADS
  // puede crear/activar campañas pagas.
  { id: "META_ADS",      label: "Meta Ads (pago)", descripcion: "Campañas pagas en Facebook + Instagram. Permite gastar presupuesto — asignar solo a usuarios autorizados a decidir gastos.", grupo: "INTEGRACIONES" },
  { id: "ASISTENTE_IA",  label: "Asistente IA",   descripcion: "Chat IA para gestionar la base",        grupo: "INTEGRACIONES" },

  // SISTEMA
  { id: "SISTEMA",       label: "Sistema",       descripcion: "Backups, crons, cache",        grupo: "SISTEMA" },
  { id: "CONFIGURACION", label: "Configuración", descripcion: "Configuración del negocio",    grupo: "SISTEMA" },
]

export const GRUPOS_LABEL: Record<SeccionInfo["grupo"], string> = {
  GENERAL: "General",
  OPERACIONES: "Operaciones",
  CATALOGO: "Catálogo",
  TALLER: "Taller",
  TESORERIA: "Tesorería",
  MARKETING: "Marketing",
  INTEGRACIONES: "Integraciones",
  SISTEMA: "Sistema",
}

/**
 * Devuelve true si el usuario tiene acceso a la seccion indicada.
 * - admins acceden a todo
 * - usuarios estandar acceden solo a las secciones en su lista `permisos`
 */
export function tieneAcceso(
  user: { role?: string | null; permisos?: string[] | null },
  seccion: SeccionId
): boolean {
  if (!user) return false
  if (user.role === "admin") return true
  return Array.isArray(user.permisos) && user.permisos.includes(seccion)
}

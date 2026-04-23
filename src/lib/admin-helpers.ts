// Utilidades comunes para el panel admin operativo

export function formatMoney(amount: number | null | undefined, moneda: string = "ARS"): string {
  if (amount == null) return "—"
  const num = amount.toLocaleString("es-AR")
  return moneda === "USD" ? `USD ${num}` : `$ ${num}`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Numeración visible: MV-0001, V-0123, OT-0042, etc.
export function formatNumero(prefix: string, numero: number): string {
  return `${prefix}-${String(numero).padStart(4, "0")}`
}

export function nombreCompleto(c: { nombre: string; apellido: string } | null | undefined): string {
  if (!c) return "—"
  return `${c.apellido}, ${c.nombre}`.trim()
}

// ==================== ESTADOS: colores para badges ====================

export const ESTADO_MANDATO_STYLES: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  ACTIVO: "bg-green-100 text-green-800",
  VENDIDO: "bg-blue-100 text-blue-800",
  CANCELADO: "bg-gray-100 text-gray-600",
  VENCIDO: "bg-red-100 text-red-800",
}

export const ESTADO_MANDATO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ACTIVO: "Activo",
  VENDIDO: "Vendido",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
}

export const ESTADO_VENTA_STYLES: Record<string, string> = {
  BORRADOR: "bg-yellow-100 text-yellow-800",
  RESERVADA: "bg-blue-100 text-blue-800",
  CONCRETADA: "bg-green-100 text-green-800",
  CANCELADA: "bg-gray-100 text-gray-600",
}

export const ESTADO_VENTA_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  RESERVADA: "Reservada",
  CONCRETADA: "Concretada",
  CANCELADA: "Cancelada",
}

export const ESTADO_OT_STYLES: Record<string, string> = {
  INGRESADA: "bg-blue-100 text-blue-800",
  EN_DIAGNOSTICO: "bg-purple-100 text-purple-800",
  PRESUPUESTADA: "bg-yellow-100 text-yellow-800",
  APROBADA: "bg-indigo-100 text-indigo-800",
  EN_REPARACION: "bg-orange-100 text-orange-800",
  LISTA: "bg-emerald-100 text-emerald-800",
  ENTREGADA: "bg-gray-100 text-gray-700",
  CANCELADA: "bg-red-100 text-red-800",
}

export const ESTADO_OT_LABELS: Record<string, string> = {
  INGRESADA: "Ingresada",
  EN_DIAGNOSTICO: "En diagnóstico",
  PRESUPUESTADA: "Presupuestada",
  APROBADA: "Aprobada",
  EN_REPARACION: "En reparación",
  LISTA: "Lista",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
}

import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import type { SeccionId } from "./secciones"

/**
 * Devuelve la sesion si el usuario esta logueado (admin o usuario estandar).
 * Retorna null si no hay sesion — esto bloquea acceso a cualquier endpoint
 * de admin a anonimos.
 *
 * Para validar acceso a una seccion concreta usar requireSection().
 * Para acciones que solo deberia hacer un admin (gestionar usuarios,
 * borrar cosas criticas, etc) usar requireFullAdmin().
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  // role puede ser "admin" o "usuario" — ambos son sesiones validas.
  // Las APIs que solo deberia ver el admin pleno usan requireFullAdmin.
  return session
}

/**
 * Solo deja pasar a usuarios con role="admin". Para acciones reservadas
 * (gestion de usuarios, etc).
 */
export async function requireFullAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "admin") return null
  return session
}

/**
 * Valida que el usuario tenga acceso a la seccion indicada.
 * - admins pasan siempre
 * - usuarios estandar solo si la seccion esta en su lista de permisos
 * Devuelve la sesion si pasa, null si no.
 */
export async function requireSection(seccion: SeccionId) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (session.user?.role === "admin") return session
  const permisos = (session.user as { permisos?: string[] })?.permisos || []
  if (!permisos.includes(seccion)) return null
  return session
}

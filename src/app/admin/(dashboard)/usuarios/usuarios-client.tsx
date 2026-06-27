"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Shield,
  ShieldCheck,
  Key,
  X,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react"
import { SECCIONES_ADMIN, GRUPOS_LABEL, type SeccionInfo } from "@/lib/secciones"

export type UsuarioUI = {
  id: string
  name: string
  email: string
  role: string
  permisos: string[]
  activo: boolean
  createdAt: string
}

export function UsuariosClient({
  usuarios,
  currentUserId,
}: {
  usuarios: UsuarioUI[]
  currentUserId: string
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<UsuarioUI | null>(null)
  const [creando, setCreando] = useState(false)

  const recargar = () => router.refresh()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="size-6 text-[#7C3AED]" />
            Usuarios del admin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Creá cuentas y elegí a qué secciones del admin tienen acceso. Solo
            vos (admin) podés ver esta página.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#7C3AED] hover:bg-[#9D5CF0] text-white px-3 py-2 text-sm font-medium"
        >
          <Plus className="size-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Lista */}
      <div className="rounded-xl border bg-white dark:bg-neutral-900 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-neutral-800/40">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Acceso</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esYo = u.id === currentUserId
              return (
                <tr
                  key={u.id}
                  className="border-t border-gray-100 dark:border-neutral-800 text-sm"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {u.name}
                    {esYo && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[#7C3AED] bg-[#7C3AED]/10 px-1.5 py-0.5 rounded">
                        vos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] font-medium">
                        <ShieldCheck className="size-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium">
                        <Shield className="size-3" />
                        Usuario
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {u.role === "admin" ? (
                      <span>Todo el admin</span>
                    ) : u.permisos.length === 0 ? (
                      <span className="text-amber-600">Sin acceso aún</span>
                    ) : (
                      <span>
                        {u.permisos.length} sección{u.permisos.length !== 1 ? "es" : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.activo ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                        Desactivado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditando(u)}
                      className="inline-flex items-center gap-1 text-xs text-[#7C3AED] hover:underline"
                    >
                      <Pencil className="size-3" />
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {creando && (
        <UsuarioModal
          onClose={() => setCreando(false)}
          onSaved={() => {
            setCreando(false)
            recargar()
          }}
        />
      )}
      {editando && (
        <UsuarioModal
          usuario={editando}
          currentUserId={currentUserId}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            recargar()
          }}
        />
      )}
    </div>
  )
}

/* ====================== MODAL CREATE/EDIT ====================== */

function UsuarioModal({
  usuario,
  currentUserId,
  onClose,
  onSaved,
}: {
  usuario?: UsuarioUI
  currentUserId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const editando = !!usuario
  const esYo = usuario && currentUserId && usuario.id === currentUserId

  const [name, setName] = useState(usuario?.name ?? "")
  const [email, setEmail] = useState(usuario?.email ?? "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "usuario">(
    (usuario?.role as "admin" | "usuario") || "usuario"
  )
  const [permisos, setPermisos] = useState<string[]>(usuario?.permisos ?? [])
  const [activo, setActivo] = useState<boolean>(usuario?.activo ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const togglePermiso = (id: string) => {
    setPermisos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setError("")
    if (!name.trim()) return setError("Nombre obligatorio")
    if (!editando && !email.trim()) return setError("Nombre de usuario obligatorio")
    if (!editando && password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres")
    }
    if (editando && password.length > 0 && password.length < 6) {
      return setError("La contraseña nueva debe tener al menos 6 caracteres")
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        role,
        permisos: role === "admin" ? [] : permisos,
        activo,
      }
      if (!editando) {
        body.email = email.trim().toLowerCase()
        body.password = password
      } else if (password.length > 0) {
        body.password = password
      }

      const url = editando
        ? `/api/admin/users/${usuario!.id}`
        : "/api/admin/users"
      const method = editando ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const raw = await res.text()
      let data: Record<string, unknown> = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = { error: raw }
      }
      if (!res.ok) {
        const errMsg = data.error
          ? String(data.error)
          : `HTTP ${res.status}: ${raw.slice(0, 200) || "sin detalle"}`
        // Loguear todo para que el admin pueda copiar/pegar si pasa de
        // nuevo. La gente reporta mejor con un error completo a la vista.
        console.error("[usuarios] Error al guardar:", { status: res.status, data, body })
        setError(errMsg)
        return
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async () => {
    if (!usuario || esYo) return
    if (!confirm(`¿Eliminar a ${usuario.name}? No se puede deshacer.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${usuario.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  // Agrupar secciones para mostrar en bloques
  const grupos = new Map<string, SeccionInfo[]>()
  for (const s of SECCIONES_ADMIN) {
    const arr = grupos.get(s.grupo) || []
    arr.push(s)
    grupos.set(s.grupo, arr)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {editando ? `Editar ${usuario!.name}` : "Nuevo usuario"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Datos basicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#7C3AED] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Usuario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="juanperez"
                disabled={editando}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#7C3AED] outline-none disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              />
              {editando && (
                <p className="text-[10px] text-gray-400 mt-1">El usuario no se puede cambiar</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1">
              <Key className="size-3" />
              {editando ? "Cambiar contraseña" : "Contraseña"}{" "}
              {!editando && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editando ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#7C3AED] outline-none"
            />
          </div>

          {/* Rol + activo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "usuario")}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#7C3AED] outline-none"
              >
                <option value="usuario">Usuario (acceso restringido)</option>
                <option value="admin">Admin (acceso total + gestiona usuarios)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  disabled={!!esYo}
                  className="size-4 rounded border-gray-300"
                />
                <span className="font-medium">
                  Cuenta activa
                  {esYo && (
                    <span className="ml-1 text-[10px] text-gray-400">
                      (no te podés desactivar a vos mismo)
                    </span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Permisos: solo para role=usuario */}
          {role === "usuario" && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Secciones que puede ver
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Marcá las que quieras que vea en su sidebar. {permisos.length} de {SECCIONES_ADMIN.length} seleccionadas.
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPermisos(SECCIONES_ADMIN.map((s) => s.id))}
                    className="text-[11px] text-[#7C3AED] hover:underline"
                  >
                    Todas
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    type="button"
                    onClick={() => setPermisos([])}
                    className="text-[11px] text-[#7C3AED] hover:underline"
                  >
                    Ninguna
                  </button>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {Array.from(grupos.entries()).map(([grupo, items]) => (
                  <div key={grupo}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      {GRUPOS_LABEL[grupo as keyof typeof GRUPOS_LABEL]}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {items.map((s) => {
                        const checked = permisos.includes(s.id)
                        return (
                          <label
                            key={s.id}
                            className={`flex items-start gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                              checked
                                ? "border-[#7C3AED] bg-[#7C3AED]/5"
                                : "border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermiso(s.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                {s.label}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                                {s.descripcion}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t bg-gray-50 dark:bg-neutral-900/60 rounded-b-xl">
          <div>
            {editando && !esYo && (
              <button
                type="button"
                onClick={handleEliminar}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#7C3AED] hover:bg-[#9D5CF0] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {editando ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

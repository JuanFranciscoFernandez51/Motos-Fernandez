"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Check, X, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Categoria = { id: string; nombre: string; tipo: string; orden: number; activa: boolean }

export function CategoriasManager({ categorias }: { categorias: Categoria[] }) {
  const ingreso = categorias.filter((c) => c.tipo === "INGRESO")
  const gasto = categorias.filter((c) => c.tipo === "GASTO")
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categorías de ingresos y gastos</CardTitle>
        <p className="text-xs text-gray-500">
          Editá las categorías de tu negocio. Al renombrar una, se actualizan los movimientos que la usaban.
        </p>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-6">
        <Columna titulo="Ingresos" tipo="INGRESO" items={ingreso} acento="emerald" />
        <Columna titulo="Gastos" tipo="GASTO" items={gasto} acento="red" />
      </CardContent>
    </Card>
  )
}

function Columna({
  titulo, tipo, items, acento,
}: {
  titulo: string
  tipo: string
  items: Categoria[]
  acento: "emerald" | "red"
}) {
  const router = useRouter()
  const [nuevo, setNuevo] = useState("")
  const [agregando, setAgregando] = useState(false)
  const Icon = acento === "emerald" ? TrendingUp : TrendingDown
  const color = acento === "emerald" ? "text-emerald-700" : "text-red-700"

  async function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    setAgregando(true)
    const res = await fetch("/api/admin/finanzas/categorias", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo }),
    })
    setAgregando(false)
    if (res.ok) { setNuevo(""); toast.success("Categoría agregada"); router.refresh() }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${color}`}>
        <Icon className="h-3.5 w-3.5" /> {titulo} <span className="text-gray-400 font-normal">({items.length})</span>
      </p>
      <div className="space-y-1">
        {items.map((c) => <Fila key={c.id} cat={c} />)}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") agregar() }}
          placeholder="Nueva categoría…"
          className="flex-1 h-9 rounded-md border border-gray-300 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A5F7]/40"
        />
        <button
          onClick={agregar}
          disabled={agregando || !nuevo.trim()}
          className="h-9 px-3 rounded-md bg-[#9D5CF0] text-white text-sm font-medium hover:bg-[#7C3AED] disabled:opacity-40 inline-flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>
    </div>
  )
}

function Fila({ cat }: { cat: Categoria }) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(cat.nombre)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const nombre = valor.trim()
    if (!nombre || nombre === cat.nombre) { setEditando(false); setValor(cat.nombre); return }
    setGuardando(true)
    const res = await fetch(`/api/admin/finanzas/categorias/${cat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    })
    setGuardando(false)
    if (res.ok) { setEditando(false); toast.success("Categoría renombrada"); router.refresh() }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error || "Error") }
  }

  async function borrar() {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Si tiene movimientos, se oculta de la lista pero el historial se mantiene.`)) return
    const res = await fetch(`/api/admin/finanzas/categorias/${cat.id}`, { method: "DELETE" })
    if (res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.success(d.desactivada ? "Categoría ocultada (tenía movimientos)" : "Categoría eliminada")
      router.refresh()
    } else toast.error("No se pudo eliminar")
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          value={valor}
          autoFocus
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") { setEditando(false); setValor(cat.nombre) } }}
          className="flex-1 h-8 rounded-md border border-[#C4A5F7] px-2 text-sm focus:outline-none"
        />
        <button onClick={guardar} disabled={guardando} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
        <button onClick={() => { setEditando(false); setValor(cat.nombre) }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
      </div>
    )
  }

  return (
    <div className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 text-sm">
      <span className="text-gray-700">{cat.nombre}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditando(true)} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200" title="Renombrar"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={borrar} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

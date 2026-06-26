"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Loader2, Check, X } from "lucide-react"

type Cuenta = {
  id: string
  nombre: string
  moneda: string
  saldoInicial: number
  excluirDeResultado: boolean
  activa: boolean
  movimientos: number
}
type Categoria = { id: string; nombre: string; tipo: string }

const inputCls =
  "rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]"

export function CuentasClient({
  cuentas,
  categorias,
}: {
  cuentas: Cuenta[]
  categorias: Categoria[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const api = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error || "Error")
        return false
      }
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  // Nueva cuenta
  const [nCuenta, setNCuenta] = useState("")
  const [nMoneda, setNMoneda] = useState("ARS")
  const [nSaldo, setNSaldo] = useState("")
  const crearCuenta = async () => {
    if (!nCuenta.trim()) return
    const ok = await api("/api/admin/finanzas/cuentas", "POST", {
      nombre: nCuenta.trim(),
      moneda: nMoneda,
      saldoInicial: parseInt(nSaldo || "0") || 0,
    })
    if (ok) { setNCuenta(""); setNSaldo("") }
  }

  // Nueva categoría
  const [nCat, setNCat] = useState("")
  const [nCatTipo, setNCatTipo] = useState("GASTO")
  const crearCat = async () => {
    if (!nCat.trim()) return
    const ok = await api("/api/admin/finanzas/categorias", "POST", { nombre: nCat.trim(), tipo: nCatTipo })
    if (ok) setNCat("")
  }

  const ingresos = categorias.filter((c) => c.tipo === "INGRESO")
  const gastos = categorias.filter((c) => c.tipo === "GASTO")

  return (
    <div className="space-y-6">
      {/* Cuentas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cuentas / cajas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr><th className="text-left py-1">Nombre</th><th>Moneda</th><th className="text-right">Saldo inicial</th><th className="text-center">En resultado</th><th className="text-center">Activa</th><th></th></tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id} className={`border-t border-gray-50 dark:border-neutral-900 ${!c.activa ? "opacity-50" : ""}`}>
                    <td className="py-1.5">
                      <input
                        defaultValue={c.nombre}
                        onBlur={(e) => e.target.value.trim() !== c.nombre && api(`/api/admin/finanzas/cuentas/${c.id}`, "PATCH", { nombre: e.target.value })}
                        className={`${inputCls} w-40`}
                      />
                    </td>
                    <td className="text-center">{c.moneda}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        defaultValue={c.saldoInicial}
                        onBlur={(e) => parseInt(e.target.value || "0") !== c.saldoInicial && api(`/api/admin/finanzas/cuentas/${c.id}`, "PATCH", { saldoInicial: parseInt(e.target.value || "0") })}
                        className={`${inputCls} w-28 text-right`}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => api(`/api/admin/finanzas/cuentas/${c.id}`, "PATCH", { excluirDeResultado: !c.excluirDeResultado })}
                        title={c.excluirDeResultado ? "NO cuenta para el resultado" : "Cuenta para el resultado"}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${!c.excluirDeResultado ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-200 text-gray-500 dark:bg-neutral-700"}`}
                      >
                        {!c.excluirDeResultado ? "Sí" : "No"}
                      </button>
                    </td>
                    <td className="text-center">
                      <button onClick={() => api(`/api/admin/finanzas/cuentas/${c.id}`, "PATCH", { activa: !c.activa })} className={c.activa ? "text-green-600" : "text-gray-400"}>
                        {c.activa ? <Check className="size-4 inline" /> : <X className="size-4 inline" />}
                      </button>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          if (confirm(c.movimientos > 0 ? `"${c.nombre}" tiene ${c.movimientos} movimientos — se va a DESACTIVAR (no se borra).` : `¿Borrar la cuenta "${c.nombre}"?`))
                            api(`/api/admin/finanzas/cuentas/${c.id}`, "DELETE")
                        }}
                        className="p-1 text-gray-300 hover:text-red-500"
                      ><Trash2 className="size-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Nueva cuenta */}
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
            <input value={nCuenta} onChange={(e) => setNCuenta(e.target.value)} placeholder="Nombre de la cuenta" className={`${inputCls} w-44`} />
            <select value={nMoneda} onChange={(e) => setNMoneda(e.target.value)} className={inputCls}><option value="ARS">ARS</option><option value="USD">USD</option></select>
            <input type="number" value={nSaldo} onChange={(e) => setNSaldo(e.target.value)} placeholder="Saldo inicial" className={`${inputCls} w-32`} />
            <button onClick={crearCuenta} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-[#6B4F7A] text-white px-3 py-1.5 text-sm hover:bg-[#8B6F9A] disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Agregar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CatColumn titulo="Ingresos" color="text-green-700 dark:text-green-300" cats={ingresos} api={api} />
            <CatColumn titulo="Gastos" color="text-red-700 dark:text-red-300" cats={gastos} api={api} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-gray-100 dark:border-neutral-800">
            <input value={nCat} onChange={(e) => setNCat(e.target.value)} placeholder="Nueva categoría" className={`${inputCls} w-48`} />
            <select value={nCatTipo} onChange={(e) => setNCatTipo(e.target.value)} className={inputCls}><option value="GASTO">Gasto</option><option value="INGRESO">Ingreso</option></select>
            <button onClick={crearCat} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-[#6B4F7A] text-white px-3 py-1.5 text-sm hover:bg-[#8B6F9A] disabled:opacity-50">
              <Plus className="size-4" /> Agregar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CatColumn({
  titulo,
  color,
  cats,
  api,
}: {
  titulo: string
  color: string
  cats: Categoria[]
  api: (url: string, method: string, body?: unknown) => Promise<boolean>
}) {
  return (
    <div>
      <p className={`text-sm font-semibold mb-2 ${color}`}>{titulo}</p>
      <div className="space-y-1">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center gap-1 group">
            <input
              defaultValue={c.nombre}
              onBlur={(e) => e.target.value.trim() !== c.nombre && e.target.value.trim() && api(`/api/admin/finanzas/categorias/${c.id}`, "PATCH", { nombre: e.target.value })}
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={() => confirm(`¿Borrar la categoría "${c.nombre}"? (los movimientos conservan el texto)`) && api(`/api/admin/finanzas/categorias/${c.id}`, "DELETE")}
              className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
            ><Trash2 className="size-3.5" /></button>
          </div>
        ))}
        {cats.length === 0 && <p className="text-xs text-gray-400">Sin categorías.</p>}
      </div>
    </div>
  )
}

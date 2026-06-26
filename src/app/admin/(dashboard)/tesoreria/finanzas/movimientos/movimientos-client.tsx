"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  ArrowLeftRight,
  Trash2,
  Loader2,
  Search,
  X,
  Check,
} from "lucide-react"

type Cuenta = { id: string; nombre: string; moneda: string }
type Categoria = { nombre: string; tipo: string }
type Mov = {
  id: string
  fecha: string
  tipo: string
  categoria: string
  descripcion: string
  monto: number
  moneda: string
  registrado: boolean
  cuentaId: string
  cuentaNombre: string
  esTransfer: boolean
}

const fmt = (n: number, moneda: string) =>
  `${moneda === "USD" ? "USD " : "$ "}${Math.abs(n).toLocaleString("es-AR")}`

const inputCls =
  "w-full rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B4F7A]"

export function MovimientosClient({
  mes,
  filtros,
  cuentas,
  categorias,
  movimientos,
}: {
  mes: string
  filtros: { cuenta: string; tipo: string; q: string }
  cuentas: Cuenta[]
  categorias: Categoria[]
  movimientos: Mov[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<{ id: string; field: string } | null>(null)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [q, setQ] = useState(filtros.q)

  // --- Form de nuevo movimiento ---
  const hoy = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [modo, setModo] = useState<"MOVIMIENTO" | "TRANSFERENCIA">("MOVIMIENTO")
  const [nFecha, setNFecha] = useState(hoy)
  const [nTipo, setNTipo] = useState<"INGRESO" | "GASTO">("GASTO")
  const [nCategoria, setNCategoria] = useState("")
  const [nCuenta, setNCuenta] = useState(cuentas[0]?.id || "")
  const [nDestino, setNDestino] = useState(cuentas[1]?.id || "")
  const [nMonto, setNMonto] = useState("")
  const [nDesc, setNDesc] = useState("")
  const [nReg, setNReg] = useState(true)

  const catsDelTipo = (tipo: string) => categorias.filter((c) => c.tipo === tipo)

  // --- Filtros → URL ---
  const setFiltro = (patch: Record<string, string>) => {
    const p = new URLSearchParams()
    const merged = { mes, cuenta: filtros.cuenta, tipo: filtros.tipo, q, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    router.push(`/admin/tesoreria/finanzas/movimientos?${p.toString()}`)
  }

  // --- Totales en vivo (del filtro actual, ARS) ---
  const totales = useMemo(() => {
    let ingresos = 0
    let gastos = 0
    for (const m of movimientos) {
      if (m.moneda !== "ARS") continue
      if (m.tipo === "INGRESO") ingresos += m.monto
      else if (m.tipo === "GASTO") gastos += m.monto
    }
    return { ingresos, gastos, resultado: ingresos - gastos }
  }, [movimientos])

  // --- Acciones ---
  const guardarCampo = async (id: string, patch: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/finanzas/movimientos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) alert((await res.json().catch(() => ({})))?.error || "No se pudo guardar")
      else router.refresh()
    } finally {
      setBusy(false)
      setEdit(null)
    }
  }

  const borrar = async (m: Mov) => {
    if (!confirm(`¿Borrar este movimiento?${m.esTransfer ? " (borra las dos patas de la transferencia)" : ""}`)) return
    setBusy(true)
    try {
      await fetch(`/api/admin/finanzas/movimientos/${m.id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const crear = async () => {
    const monto = parseInt(nMonto || "0")
    if (!monto || monto <= 0) return alert("Cargá un monto válido")
    const body =
      modo === "MOVIMIENTO"
        ? {
            modo,
            fecha: nFecha,
            tipo: nTipo,
            categoria: nCategoria || catsDelTipo(nTipo)[0]?.nombre || "Otros",
            cuentaId: nCuenta,
            monto,
            registrado: nReg,
            descripcion: nDesc,
          }
        : {
            modo,
            fecha: nFecha,
            cuentaOrigenId: nCuenta,
            cuentaDestinoId: nDestino,
            monto,
            registrado: nReg,
            descripcion: nDesc,
          }
    setBusy(true)
    try {
      const res = await fetch("/api/admin/finanzas/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) return alert(d.error || "No se pudo crear")
      setNMonto("")
      setNDesc("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={mes}
          onChange={(e) => setFiltro({ mes: e.target.value })}
          className={`${inputCls} w-auto`}
        />
        <select value={filtros.cuenta} onChange={(e) => setFiltro({ cuenta: e.target.value })} className={`${inputCls} w-auto`}>
          <option value="">Todas las cuentas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select value={filtros.tipo} onChange={(e) => setFiltro({ tipo: e.target.value })} className={`${inputCls} w-auto`}>
          <option value="">Todos</option>
          <option value="INGRESO">Ingresos</option>
          <option value="GASTO">Gastos</option>
          <option value="TRANSFERENCIA">Transferencias</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setFiltro({ q })}
            placeholder="Buscar descripción / categoría…"
            className={`${inputCls} pl-8`}
          />
        </div>
        <button onClick={() => setNuevoOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B4F7A] text-white px-3 py-1.5 text-sm font-medium hover:bg-[#8B6F9A]">
          <Plus className="size-4" /> Nuevo
        </button>
      </div>

      {/* Form nuevo */}
      {nuevoOpen && (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-900/40 p-4 space-y-3">
          <div className="flex gap-1">
            {(["MOVIMIENTO", "TRANSFERENCIA"] as const).map((m) => (
              <button key={m} onClick={() => setModo(m)} className={`rounded-lg px-3 py-1 text-xs font-medium ${modo === m ? "bg-[#6B4F7A] text-white" : "bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"}`}>
                {m === "MOVIMIENTO" ? "Ingreso / Gasto" : "Transferencia"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <div>
              <label className="text-[11px] text-gray-500">Fecha</label>
              <input type="date" value={nFecha} onChange={(e) => setNFecha(e.target.value)} className={inputCls} />
            </div>
            {modo === "MOVIMIENTO" ? (
              <>
                <div>
                  <label className="text-[11px] text-gray-500">Tipo</label>
                  <select value={nTipo} onChange={(e) => { setNTipo(e.target.value as "INGRESO" | "GASTO"); setNCategoria("") }} className={inputCls}>
                    <option value="GASTO">Gasto</option>
                    <option value="INGRESO">Ingreso</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Categoría</label>
                  <select value={nCategoria} onChange={(e) => setNCategoria(e.target.value)} className={inputCls}>
                    {catsDelTipo(nTipo).map((c) => (
                      <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Cuenta</label>
                  <select value={nCuenta} onChange={(e) => setNCuenta(e.target.value)} className={inputCls}>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[11px] text-gray-500">Desde</label>
                  <select value={nCuenta} onChange={(e) => setNCuenta(e.target.value)} className={inputCls}>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500">Hacia</label>
                  <select value={nDestino} onChange={(e) => setNDestino(e.target.value)} className={inputCls}>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div />
              </>
            )}
            <div>
              <label className="text-[11px] text-gray-500">Monto</label>
              <input type="number" value={nMonto} onChange={(e) => setNMonto(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-gray-500">Descripción</label>
              <input value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="Detalle…" className={inputCls} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setNReg((v) => !v)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${nReg ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-200 text-gray-700 dark:bg-neutral-700 dark:text-gray-200"}`}>
                {nReg ? "Blanco" : "En negro"}
              </button>
            </div>
            <button onClick={crear} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar
            </button>
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-3 py-1.5 font-medium">
          Ingresos {fmt(totales.ingresos, "ARS")}
        </span>
        <span className="rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-3 py-1.5 font-medium">
          Gastos {fmt(totales.gastos, "ARS")}
        </span>
        <span className={`rounded-lg px-3 py-1.5 font-bold ${totales.resultado >= 0 ? "bg-[#6B4F7A]/10 text-[#6B4F7A]" : "bg-red-100 text-red-700"}`}>
          Resultado {totales.resultado < 0 ? "- " : ""}{fmt(totales.resultado, "ARS")}
        </span>
        <span className="text-gray-400 px-2 py-1.5">{movimientos.length} mov.</span>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-200 dark:border-neutral-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-900/60">
            <tr>
              <th className="text-left px-2 py-2">Fecha</th>
              <th className="text-left px-2 py-2">Categoría</th>
              <th className="text-left px-2 py-2">Descripción</th>
              <th className="text-left px-2 py-2">Cuenta</th>
              <th className="text-center px-2 py-2">B/N</th>
              <th className="text-right px-2 py-2">Monto</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin movimientos en este filtro.</td></tr>
            ) : (
              movimientos.map((m) => {
                const editing = (f: string) => edit?.id === m.id && edit.field === f
                const signo = m.tipo === "GASTO" ? "-" : m.tipo === "INGRESO" ? "+" : ""
                const montoColor = m.tipo === "INGRESO" ? "text-green-600 dark:text-green-300" : m.tipo === "GASTO" ? "text-red-600 dark:text-red-300" : "text-gray-500"
                return (
                  <tr key={m.id} className="border-t border-gray-50 dark:border-neutral-900 hover:bg-gray-50/50 dark:hover:bg-neutral-900/40">
                    {/* Fecha */}
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {editing("fecha") ? (
                        <input type="date" defaultValue={m.fecha} autoFocus onBlur={(e) => guardarCampo(m.id, { fecha: e.target.value })} className={inputCls} />
                      ) : (
                        <button onClick={() => setEdit({ id: m.id, field: "fecha" })} className="hover:underline text-gray-600 dark:text-gray-300">
                          {new Date(m.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                        </button>
                      )}
                    </td>
                    {/* Categoría */}
                    <td className="px-2 py-1.5">
                      {m.esTransfer ? (
                        <span className="inline-flex items-center gap-1 text-gray-500 text-xs"><ArrowLeftRight className="size-3" /> Transfer.</span>
                      ) : editing("categoria") ? (
                        <select defaultValue={m.categoria} autoFocus onChange={(e) => guardarCampo(m.id, { categoria: e.target.value })} onBlur={() => setEdit(null)} className={inputCls}>
                          {catsDelTipo(m.tipo).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                      ) : (
                        <button onClick={() => setEdit({ id: m.id, field: "categoria" })} className="hover:underline text-left">{m.categoria}</button>
                      )}
                    </td>
                    {/* Descripción */}
                    <td className="px-2 py-1.5 max-w-[240px]">
                      {editing("descripcion") ? (
                        <input defaultValue={m.descripcion} autoFocus onBlur={(e) => guardarCampo(m.id, { descripcion: e.target.value })} className={inputCls} />
                      ) : (
                        <button onClick={() => setEdit({ id: m.id, field: "descripcion" })} className="hover:underline text-left truncate block w-full text-gray-600 dark:text-gray-300">
                          {m.descripcion || <span className="text-gray-300">—</span>}
                        </button>
                      )}
                    </td>
                    {/* Cuenta */}
                    <td className="px-2 py-1.5">
                      {m.esTransfer ? (
                        <span className="text-gray-500">{m.cuentaNombre}</span>
                      ) : editing("cuenta") ? (
                        <select defaultValue={m.cuentaId} autoFocus onChange={(e) => guardarCampo(m.id, { cuentaId: e.target.value })} onBlur={() => setEdit(null)} className={inputCls}>
                          {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      ) : (
                        <button onClick={() => setEdit({ id: m.id, field: "cuenta" })} className="hover:underline">{m.cuentaNombre}</button>
                      )}
                    </td>
                    {/* Registrado */}
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => guardarCampo(m.id, { registrado: !m.registrado })} title={m.registrado ? "Blanco (registrado)" : "En negro"} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.registrado ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-800 text-white"}`}>
                        {m.registrado ? "B" : "N"}
                      </button>
                    </td>
                    {/* Monto */}
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      {!m.esTransfer && editing("monto") ? (
                        <input type="number" defaultValue={m.monto} autoFocus onBlur={(e) => guardarCampo(m.id, { monto: parseInt(e.target.value || "0") })} className={`${inputCls} text-right w-28`} />
                      ) : (
                        <button onClick={() => !m.esTransfer && setEdit({ id: m.id, field: "monto" })} className={`font-mono font-medium ${montoColor} ${m.esTransfer ? "cursor-default" : "hover:underline"}`}>
                          {signo}{fmt(m.monto, m.moneda)}
                        </button>
                      )}
                    </td>
                    {/* Borrar */}
                    <td className="px-1">
                      <button onClick={() => borrar(m)} disabled={busy} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {busy && (
        <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Guardando…</p>
      )}
      {edit && (
        <button onClick={() => setEdit(null)} className="text-xs text-gray-400 inline-flex items-center gap-1">
          <X className="size-3" /> Cancelar edición
        </button>
      )}
    </div>
  )
}
